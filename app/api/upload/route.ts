import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { PDFParse } from "pdf-parse";
import { auth } from "@/auth";
import { buildSplitResult, splitPagesIntoSections } from "@/lib/sectioning";
import { segmentIntoConcepts } from "@/lib/ai";
import { savePdfFile } from "@/lib/pdfStorage";
import { convertPptxToPdf } from "@/lib/pptxConvert";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const THUMBNAIL_WIDTH = 220;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderId = formData.get("folderId");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const filename = (file as File).name;
    const lowerFilename = filename.toLowerCase();
    const isPptx = lowerFilename.endsWith(".pptx");
    const isPdf = lowerFilename.endsWith(".pdf");
    if (!isPdf && !isPptx) {
      return NextResponse.json({ error: "Only PDF and PPTX files are supported." }, { status: 400 });
    }

    const bytes = await (file as File).arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    // Hash the original upload (not the converted PDF) so re-uploading the
    // same source .pptx is still recognized as a duplicate.
    const contentHash = createHash("sha256").update(originalBuffer).digest("hex");

    const duplicate = await prisma.document.findFirst({
      where: { userId: session.user.id, contentHash },
      select: { id: true, filename: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `You already uploaded this file as "${duplicate.filename}".`, duplicateDocumentId: duplicate.id },
        { status: 409 }
      );
    }

    // PPTX support piggybacks entirely on the existing PDF pipeline: convert
    // to PDF once via headless LibreOffice, then treat it exactly like a
    // native PDF upload for text extraction, screenshots, and storage.
    let buffer: Buffer;
    if (isPptx) {
      try {
        buffer = await convertPptxToPdf(originalBuffer);
      } catch {
        return NextResponse.json(
          { error: "Failed to convert the PowerPoint file. Please make sure it's a valid .pptx file.", pages: [], sections: [] },
          { status: 500 }
        );
      }
    } else {
      buffer = originalBuffer;
    }

    const parser = new PDFParse({ data: buffer });

    let textResult;
    let screenshotResult;
    try {
      textResult = await parser.getText();
      screenshotResult = await parser.getScreenshot({ desiredWidth: THUMBNAIL_WIDTH, imageBuffer: false });
    } finally {
      await parser.destroy();
    }

    const thumbnailsByPage = new Map(screenshotResult.pages.map((shot) => [shot.pageNumber, shot.dataUrl]));

    const pageInputs = textResult.pages.map((page) => ({ num: page.num, text: page.text }));
    const aiSections = await segmentIntoConcepts(pageInputs);
    const { sections, pageSectionMap } = aiSections
      ? buildSplitResult(aiSections.map((section, index) => ({ id: `section-${index + 1}`, title: section.title, pageNumbers: section.pageNumbers })))
      : splitPagesIntoSections(pageInputs);

    const documentId = randomUUID();
    const filePath = await savePdfFile(session.user.id, documentId, buffer);

    await prisma.document.create({
      data: {
        id: documentId,
        userId: session.user.id,
        folderId: typeof folderId === "string" && folderId ? folderId : null,
        filename,
        filePath,
        contentHash,
        thumbnailDataUrl: thumbnailsByPage.get(1) || null,
        pages: {
          create: textResult.pages.map((page) => ({
            pageNumber: page.num,
            text: page.text,
            thumbnailDataUrl: thumbnailsByPage.get(page.num) || null,
          })),
        },
        sections: {
          create: sections.map((section, index) => ({
            title: section.title,
            order: index,
            pageNumbers: JSON.stringify(section.pageNumbers),
          })),
        },
      },
    });

    const pages = textResult.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text,
      thumbnailDataUrl: thumbnailsByPage.get(page.num) || "",
      sectionId: pageSectionMap[page.num] || sections[0]?.id || "section-1",
    }));

    return NextResponse.json({
      documentId,
      filename,
      pages,
      sections,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
        pages: [],
        sections: [],
      },
      { status: 500 }
    );
  }
}
