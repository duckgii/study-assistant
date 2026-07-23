import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const SOFFICE_PATH = process.env.SOFFICE_PATH || "soffice";
const CONVERT_TIMEOUT_MS = 120_000;

// Converts a .pptx file to PDF bytes via a headless LibreOffice invocation,
// then hands the result off to the existing PDF pipeline (text extraction,
// screenshots, segmentation) unchanged. Each call gets its own scratch
// profile dir (-env:UserInstallation) so concurrent conversions don't fight
// over LibreOffice's single-instance lock.
export async function convertPptxToPdf(pptxBuffer: Buffer): Promise<Buffer> {
  const workDir = await mkdtemp(join(tmpdir(), "pptx-convert-"));
  const profileDir = join(workDir, "profile");
  const inputPath = join(workDir, "input.pptx");

  try {
    await writeFile(inputPath, pptxBuffer);
    await execFileAsync(
      SOFFICE_PATH,
      ["-env:UserInstallation=file://" + profileDir, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", workDir, inputPath],
      { timeout: CONVERT_TIMEOUT_MS }
    );
    return await readFile(join(workDir, "input.pdf"));
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
