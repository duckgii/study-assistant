import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Deleting a folder cascades to its subfolders (schema: Folder.parent onDelete
// Cascade), but documents anywhere in that subtree are NOT deleted — their
// folderId is set to null (schema: Document.folder onDelete: SetNull), so
// they reappear at the top level of the library instead of being destroyed.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { folderId } = await params;
  const folder = await prisma.folder.findFirst({ where: { id: folderId, userId: session.user.id } });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  await prisma.folder.delete({ where: { id: folderId } });
  return NextResponse.json({ ok: true });
}
