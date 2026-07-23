import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deletePdfFile } from "@/lib/pdfStorage";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { documentId } = await params;
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      sections: { orderBy: { order: "asc" } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const sections = document.sections.map((section) => ({
    id: section.id,
    title: section.title,
    pageNumbers: JSON.parse(section.pageNumbers) as number[],
  }));

  const pageSectionMap = new Map<number, string>();
  sections.forEach((section) => section.pageNumbers.forEach((num) => pageSectionMap.set(num, section.id)));

  await prisma.document.update({ where: { id: documentId }, data: { lastOpenedAt: new Date() } });

  return NextResponse.json({
    documentId: document.id,
    filename: document.filename,
    lastPageNumber: document.lastPageNumber,
    sections,
    pages: document.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text,
      thumbnailDataUrl: page.thumbnailDataUrl || "",
      sectionId: pageSectionMap.get(page.pageNumber) || sections[0]?.id || "",
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { documentId } = await params;
  const owned = await prisma.document.findFirst({ where: { id: documentId, userId: session.user.id } });
  if (!owned) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { lastPageNumber, reviewScore } = await request.json();
  const data: { lastPageNumber?: number; completedAt?: Date; lastReviewScore?: number } = {};

  if (lastPageNumber !== undefined) {
    if (typeof lastPageNumber !== "number") {
      return NextResponse.json({ error: "lastPageNumber must be a number." }, { status: 400 });
    }
    data.lastPageNumber = lastPageNumber;
  }

  // Submitting the final review quiz marks the document as fully studied.
  if (reviewScore !== undefined) {
    if (typeof reviewScore !== "number") {
      return NextResponse.json({ error: "reviewScore must be a number." }, { status: 400 });
    }
    data.completedAt = new Date();
    data.lastReviewScore = reviewScore;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await prisma.document.update({ where: { id: documentId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { documentId } = await params;
  const document = await prisma.document.findFirst({ where: { id: documentId, userId: session.user.id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Pages/sections cascade automatically via the schema's onDelete: Cascade.
  await prisma.document.delete({ where: { id: documentId } });
  // Best-effort: the DB record is already gone either way, so a missing or
  // already-removed file on disk shouldn't turn this into a failed request.
  await deletePdfFile(document.filePath).catch(() => {});

  return NextResponse.json({ ok: true });
}
