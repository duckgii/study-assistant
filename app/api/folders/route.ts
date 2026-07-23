import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Walks parentFolderId up to the root, returning [{id: null, name: "Home"}, ..., current].
async function buildBreadcrumb(userId: string, folderId: string | null) {
  const breadcrumb: Array<{ id: string | null; name: string }> = [];
  let currentId = folderId;

  while (currentId) {
    const folder = await prisma.folder.findFirst({ where: { id: currentId, userId } });
    if (!folder) break;
    breadcrumb.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentFolderId;
  }

  breadcrumb.unshift({ id: null, name: "Home" });
  return breadcrumb;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const folderId = request.nextUrl.searchParams.get("folderId") || null;
  const userId = session.user.id;

  if (folderId) {
    const owned = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!owned) {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }
  }

  const [folders, documents, breadcrumb] = await Promise.all([
    prisma.folder.findMany({ where: { userId, parentFolderId: folderId }, orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where: { userId, folderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        thumbnailDataUrl: true,
        createdAt: true,
        lastOpenedAt: true,
        lastPageNumber: true,
        completedAt: true,
        lastReviewScore: true,
        _count: { select: { pages: true } },
      },
    }),
    buildBreadcrumb(userId, folderId),
  ]);

  return NextResponse.json({
    breadcrumb,
    folders: folders.map((folder) => ({ id: folder.id, name: folder.name })),
    documents: documents.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      thumbnailDataUrl: doc.thumbnailDataUrl,
      createdAt: doc.createdAt,
      lastOpenedAt: doc.lastOpenedAt,
      lastPageNumber: doc.lastPageNumber,
      pageCount: doc._count.pages,
      completedAt: doc.completedAt,
      lastReviewScore: doc.lastReviewScore,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { name, parentFolderId } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Folder name is required." }, { status: 400 });
  }

  if (parentFolderId) {
    const owned = await prisma.folder.findFirst({ where: { id: parentFolderId, userId: session.user.id } });
    if (!owned) {
      return NextResponse.json({ error: "Parent folder not found." }, { status: 404 });
    }
  }

  const folder = await prisma.folder.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      parentFolderId: typeof parentFolderId === "string" && parentFolderId ? parentFolderId : null,
    },
  });

  return NextResponse.json({ id: folder.id, name: folder.name });
}
