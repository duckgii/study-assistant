export interface PageInput {
  num: number;
  text: string;
}

export interface SectionMeta {
  id: string;
  title: string;
  pageNumbers: number[];
}

export interface SplitResult {
  sections: SectionMeta[];
  pageSectionMap: Record<number, string>;
}

const PAGE_MARKER_PATTERN = /^--\s*\d+\s*of\s*\d+\s*--$/i;
const HEADING_PATTERN = /^(chapter|section|introduction|conclusion|overview|summary|part)\s*\d*[:.-]?\s*/i;
const CHUNK_SIZE = 3;

function cleanPageLines(rawText: string): string[] {
  return rawText
    .split(/\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0 && !PAGE_MARKER_PATTERN.test(line));
}

// Only the first couple of lines on a page are checked against explicit
// heading keywords. Scanning every line (and matching any short, capitalized
// line) over-segments slide-style PDFs, where nearly every bullet qualifies.
function findPageHeading(rawText: string): string | null {
  const lines = cleanPageLines(rawText).slice(0, 2);
  const headingLine = lines.find((line) => HEADING_PATTERN.test(line));
  return headingLine ? headingLine.replace(/^#+\s*/, "").trim() : null;
}

export function buildSplitResult(sections: SectionMeta[]): SplitResult {
  const pageSectionMap: Record<number, string> = {};
  sections.forEach((section) => {
    section.pageNumbers.forEach((num) => {
      pageSectionMap[num] = section.id;
    });
  });
  return { sections, pageSectionMap };
}

export function splitPagesIntoSections(pages: PageInput[]): SplitResult {
  if (pages.length === 0) {
    return { sections: [], pageSectionMap: {} };
  }

  const detected: SectionMeta[] = [];
  let currentTitle = "Introduction";
  let currentPages: number[] = [];

  const flush = () => {
    if (currentPages.length > 0) {
      detected.push({ id: `section-${detected.length + 1}`, title: currentTitle, pageNumbers: [...currentPages] });
    }
  };

  pages.forEach((page) => {
    const heading = findPageHeading(page.text);
    if (heading) {
      flush();
      currentTitle = heading || "Untitled Section";
      currentPages = [];
    }
    currentPages.push(page.num);
  });

  flush();

  if (detected.length >= 2) {
    return buildSplitResult(detected);
  }

  const chunked: SectionMeta[] = [];
  for (let index = 0; index < pages.length; index += CHUNK_SIZE) {
    const chunkPages = pages.slice(index, index + CHUNK_SIZE).map((page) => page.num);
    chunked.push({
      id: `section-${chunked.length + 1}`,
      title: `Pages ${chunkPages[0]}-${chunkPages[chunkPages.length - 1]}`,
      pageNumbers: chunkPages,
    });
  }

  return buildSplitResult(chunked.length > 0 ? chunked : [{ id: "section-1", title: "Main Section", pageNumbers: pages.map((page) => page.num) }]);
}
