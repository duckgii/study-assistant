import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readPdfFile } from "@/lib/pdfStorage";

export const runtime = "nodejs";

const FULL_RES_WIDTH = 1400;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string; pageNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { documentId, pageNumber } = await params;
  const pageNum = Number(pageNumber);

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return NextResponse.json({ error: "Invalid page number." }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readPdfFile(document.filePath);
  } catch {
    return NextResponse.json({ error: "The PDF file for this document is missing on the server." }, { status: 404 });
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getScreenshot({ partial: [pageNum], desiredWidth: FULL_RES_WIDTH, imageBuffer: false });
    const page = result.pages[0];
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    return NextResponse.json({
      pageNumber: page.pageNumber,
      imageDataUrl: page.dataUrl,
      width: page.width,
      height: page.height,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to render page." },
      { status: 500 }
    );
  } finally {
    await parser.destroy();
  }
}
