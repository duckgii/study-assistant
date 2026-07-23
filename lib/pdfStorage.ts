import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

function resolveUserDir(userId: string): string {
  return path.join(UPLOADS_ROOT, userId);
}

// Returns the relative path (from the uploads root) to store on the Document
// record — never the absolute filesystem path, so the storage root can move.
export async function savePdfFile(userId: string, documentId: string, buffer: Buffer): Promise<string> {
  const dir = resolveUserDir(userId);
  await mkdir(dir, { recursive: true });
  const relativePath = path.join(userId, `${documentId}.pdf`);
  await writeFile(path.join(UPLOADS_ROOT, relativePath), buffer);
  return relativePath;
}

export async function readPdfFile(relativePath: string): Promise<Buffer> {
  return readFile(path.join(UPLOADS_ROOT, relativePath));
}

export async function deletePdfFile(relativePath: string): Promise<void> {
  await unlink(path.join(UPLOADS_ROOT, relativePath));
}
