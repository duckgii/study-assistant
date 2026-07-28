// Decides, per section, whether an AI explanation and/or quiz are worth generating.
// Runs as a local heuristic (no network call) so it adds zero latency before
// kicking off the actual explanation/quiz requests.

const TRIVIAL_TITLE_PATTERN = /^(agenda|contents?|table of contents|outline|references?|bibliography|acknowledg(e)?ments?|questions?|thank you|appendix|copyright|title page|overview)\W*$/i;
const MIN_SUBSTANTIVE_CHARS = 220;
const MIN_WORD_COUNT = 30;

// Pages with less extracted text than this are likely a diagram, photo, or
// scanned page — pdf-parse can't read those, so treat them as worth showing
// to a vision-capable model instead of judging them by text length alone.
export const SPARSE_TEXT_THRESHOLD = 40;

// Below this fraction of letters/digits among non-whitespace characters, text
// is treated as unreliable garbage rather than real content — e.g. a PDF
// exported from a handwriting app with no real text layer can still yield
// 100+ "characters" per page (stray arrows, brackets, misdecoded glyphs) that
// clear SPARSE_TEXT_THRESHOLD by length alone while containing almost no
// actual letters. Validated against a known-garbled file (29/30 pages
// correctly flagged) and three real PDFs (0/76 pages false-flagged).
const MIN_CONTENT_CHAR_RATIO = 0.6;

export interface SectionRelevance {
  needsExplanation: boolean;
  needsQuiz: boolean;
}

export interface VisualPage {
  text: string;
  thumbnailDataUrl?: string | null;
}

// True when `text` is too short, or long enough but mostly non-letter/digit
// noise — in both cases the page's real content (if any) is very likely only
// visible in its image, not its extracted text.
export function isUnreliableText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < SPARSE_TEXT_THRESHOLD) return true;

  const nonWhitespace = trimmed.replace(/\s/g, "");
  if (nonWhitespace.length === 0) return true;

  const contentChars = (nonWhitespace.match(/[\p{L}\p{N}]/gu) || []).length;
  return contentChars / nonWhitespace.length < MIN_CONTENT_CHAR_RATIO;
}

export function hasVisualContent(pages: VisualPage[]): boolean {
  return pages.some((page) => isUnreliableText(page.text) && !!page.thumbnailDataUrl);
}

export function assessSectionRelevance(sectionTitle: string, sectionContent: string, sectionHasVisualContent = false): SectionRelevance {
  const cleaned = sectionContent.replace(/\s+/g, " ").trim();
  const wordCount = cleaned.length === 0 ? 0 : cleaned.split(" ").filter(Boolean).length;
  const isTrivialTitle = TRIVIAL_TITLE_PATTERN.test(sectionTitle.trim());
  // A section that's "too thin" in text can still be worth explaining if it's
  // actually a diagram/photo page — don't silently skip those.
  const isTooThin = !sectionHasVisualContent && (cleaned.length < MIN_SUBSTANTIVE_CHARS || wordCount < MIN_WORD_COUNT);

  if (isTrivialTitle || isTooThin) {
    return { needsExplanation: false, needsQuiz: false };
  }

  return { needsExplanation: true, needsQuiz: true };
}
