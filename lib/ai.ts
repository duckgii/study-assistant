import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "@/lib/prompts";
import { createConceptQuiz, createReviewQuiz } from "@/lib/quizGenerator";
import { assessSectionRelevance, hasVisualContent, SPARSE_TEXT_THRESHOLD } from "@/lib/contentGate";

const GEMINI_MODEL = "gemini-flash-lite-latest";
const MAX_IMAGES_PER_CALL = 4;

export type Language = "en" | "ko";

const LANGUAGE_NAMES: Record<Language, string> = { en: "English", ko: "Korean (한국어)" };

// Appended to every prompt right before it's sent, rather than baked into
// each template — keeps the language switch a single point of control for
// however many templates lib/prompts.ts grows to.
function withLanguage(prompt: string, language: Language): string {
  const languageName = LANGUAGE_NAMES[language];
  return `${prompt}\n\nIMPORTANT: Write your entire response in ${languageName}. If your response is JSON, keep the JSON structure and key names exactly as specified, but write every text value (titles, questions, options, answers, explanations, summaries, strategies) in ${languageName}. Exception: if the instructions above specify an exact control keyword to respond with in certain cases (for example SKIP or NONE), keep that keyword exactly as given, in English, unchanged — do not translate it.`;
}

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export interface SectionPage {
  pageNumber: number;
  text: string;
  thumbnailDataUrl?: string | null;
}

export interface ExistingQuizFact {
  question: string;
  correctAnswer: string;
}

interface ImagePart {
  mimeType: string;
  data: string;
}

function parseDataUrl(dataUrl: string): ImagePart | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

// Pages with little to no extractable text are likely diagrams, photos, or
// scanned content that pdf-parse can't read — attach the page image itself
// (already generated as a thumbnail at upload time) so Gemini's vision can
// actually look at it, capped so one section doesn't balloon the request.
function collectVisualParts(pages: SectionPage[]): ImagePart[] {
  const images: ImagePart[] = [];
  for (const page of pages) {
    if (images.length >= MAX_IMAGES_PER_CALL) break;
    if (page.text.trim().length >= SPARSE_TEXT_THRESHOLD || !page.thumbnailDataUrl) continue;
    const parsed = parseDataUrl(page.thumbnailDataUrl);
    if (parsed) images.push(parsed);
  }
  return images;
}

// Always flags attached images explicitly, even when there's some text —
// a short title-like line (e.g. "HCR Flow Chart") next to a real diagram
// otherwise reads as a bare heading with nothing to explain, and the model
// skips it without ever weighing the image.
function buildContentWithImageNote(text: string, maxLen: number, images: ImagePart[]): string {
  const truncated = text.slice(0, maxLen);
  if (images.length === 0) return truncated;
  const note = `(${images.length} page image${images.length > 1 ? "s" : ""} from this section are attached below — some or all of this section's real content may only be visible in those images, not in the text above. Do not treat this as a bare title with nothing to explain just because the extracted text is short.)`;
  return truncated ? `${truncated}\n\n${note}` : note;
}

// Word-overlap similarity, used to catch "add more" questions that test the
// same underlying fact as one already asked even when phrased completely
// differently (e.g. a true/false restating a multiple-choice's fact) — the
// model doesn't reliably self-police this over repeated rounds, especially
// once the source material's easy facts are used up.
function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_ANSWER_SIMILARITY = 0.45;
const DUPLICATE_QUESTION_SIMILARITY = 0.55;

function isDuplicateFact(candidate: { question: string; correctAnswer: string }, existing: ExistingQuizFact[]): boolean {
  const candidateAnswerWords = significantWords(candidate.correctAnswer);
  const candidateQuestionWords = significantWords(candidate.question);
  return existing.some((fact) => {
    const answerSim = jaccardSimilarity(candidateAnswerWords, significantWords(fact.correctAnswer));
    if (answerSim >= DUPLICATE_ANSWER_SIMILARITY) return true;
    // Generic answers ("True"/"False") carry no signal on their own — fall
    // back to comparing the questions themselves for those.
    const questionSim = jaccardSimilarity(candidateQuestionWords, significantWords(fact.question));
    return questionSim >= DUPLICATE_QUESTION_SIMILARITY;
  });
}

// gemini-flash-lite-latest has no thinking mode, so there's no thinkingConfig
// to pass (and passing one 400s) — unlike the full flash-latest model used
// previously.
async function askGemini(prompt: string, maxOutputTokens: number, images: ImagePart[] = []): Promise<string> {
  const contents =
    images.length > 0
      ? [{ text: prompt }, ...images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } }))]
      : prompt;
  const response = await gemini!.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { maxOutputTokens },
  });
  return response.text || "";
}

export interface PreLearningOutput {
  summary: string;
}

export interface RangeSection {
  id: string;
  title: string;
  content: string;
}

export interface ExplanationOutput {
  strategy: string;
  explanation: string;
}

export interface QuizItem {
  id: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

function createFallbackPreLearning(rangeTitle: string, sections: RangeSection[]): PreLearningOutput {
  if (sections.length === 0) {
    return { summary: `No concepts were selected for "${rangeTitle}" yet.` };
  }

  const bullets = sections
    .filter((section) => assessSectionRelevance(section.title, section.content).needsExplanation)
    .map((section) => `- **${section.title}** — ${section.content.replace(/\s+/g, " ").trim().slice(0, 110)}${section.content.length > 110 ? "..." : ""}`)
    .join("\n");

  return {
    summary: `This session covers "${rangeTitle}". Key concepts:\n\n${bullets || "- Nothing substantial to preview yet."}`,
  };
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function inferStrategy(sectionTitle: string, sectionContent: string) {
  const lowered = `${sectionTitle} ${sectionContent}`.toLowerCase();
  if (lowered.includes("compare") || lowered.includes("difference") || lowered.includes("versus")) return "comparison";
  if (lowered.includes("process") || lowered.includes("step") || lowered.includes("how")) return "story";
  if (lowered.includes("formula") || lowered.includes("equation") || lowered.includes("rule")) return "visual pattern";
  if (lowered.includes("cause") || lowered.includes("effect") || lowered.includes("why")) return "causal diagram";
  return "analogy";
}

// Cuts at the last whole word instead of mid-word, so the fallback never ends
// on a fragment like "...other connectab".
function truncateAtWordBoundary(text: string, maxLen: number): string {
  const cleaned = text.replace(/[▪•●○◦‣∙·]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

function createFallbackExplanation(sectionTitle: string, sectionContent: string): ExplanationOutput {
  const strategy = inferStrategy(sectionTitle, sectionContent);
  const snippet = truncateAtWordBoundary(sectionContent, 200);

  const paragraphs = [
    `**${sectionTitle}** is a core idea in this section — worth understanding well, since it's the foundation for what comes next.`,
    snippet && `> ${snippet}`,
    `**Memory hook:** picture it as a **${strategy}** — that connection makes it easier to recall later.`,
  ].filter(Boolean);

  return { strategy, explanation: paragraphs.join("\n\n") };
}

interface RawQuizItem {
  type?: unknown;
  question?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  difficulty?: unknown;
}

// Validates and normalizes a model's JSON quiz response into real QuizItems,
// dropping any entry that doesn't have at least a question and an answer.
function normalizeQuizItems(raw: unknown, idPrefix: string): QuizItem[] | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { questions?: unknown }).questions)) return null;

  const items = (raw as { questions: RawQuizItem[] }).questions;
  const normalized: QuizItem[] = [];

  items.forEach((item) => {
    if (typeof item?.question !== "string" || typeof item?.correctAnswer !== "string" || !item.question.trim() || !item.correctAnswer.trim()) return;

    const type: QuizItem["type"] = item.type === "true-false" || item.type === "short-answer" ? item.type : "multiple-choice";
    const difficulty: QuizItem["difficulty"] = item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium";
    const options = type === "multiple-choice" && Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0) : undefined;

    if (type === "multiple-choice" && (!options || options.length < 2)) return;

    normalized.push({
      id: `${idPrefix}-${normalized.length + 1}`,
      type,
      question: item.question,
      options,
      correctAnswer: item.correctAnswer,
      explanation: typeof item.explanation === "string" && item.explanation.trim() ? item.explanation : "Generated by AI tutor.",
      difficulty,
    });
  });

  return normalized.length > 0 ? normalized : null;
}

export async function generatePreLearning(rangeTitle: string, sections: RangeSection[], language: Language = "en"): Promise<PreLearningOutput> {
  if (!gemini || sections.length === 0) return createFallbackPreLearning(rangeTitle, sections);

  try {
    const sectionListText = sections.map((section, index) => `${index + 1}. ${section.title}\n${section.content.slice(0, 800)}`).join("\n\n");
    const prompt = withLanguage(buildPrompt("preLearning", { title: rangeTitle, sectionList: sectionListText }), language);
    const text = (await askGemini(prompt, 512)).trim();
    return text ? { summary: text } : createFallbackPreLearning(rangeTitle, sections);
  } catch {
    return createFallbackPreLearning(rangeTitle, sections);
  }
}

// Returns null when the section is too trivial (title-only slide, agenda, references, etc.)
// to be worth an AI explanation — checked before any network call so skipping costs nothing.
// `pages` carries each page's own text and thumbnail so pages that are mostly
// a diagram or photo (little extracted text) can be shown to the model as an
// image instead of being judged — or explained — from text alone.
export async function generateExplanation(sectionTitle: string, pages: SectionPage[], language: Language = "en"): Promise<ExplanationOutput | null> {
  const sectionContent = pages.map((page) => page.text).join("\n\n");
  const sectionHasVisuals = hasVisualContent(pages);
  if (!assessSectionRelevance(sectionTitle, sectionContent, sectionHasVisuals).needsExplanation) return null;
  if (!gemini) return createFallbackExplanation(sectionTitle, sectionContent);

  try {
    const images = collectVisualParts(pages);
    const prompt = withLanguage(
      buildPrompt("conceptExplanation", {
        title: sectionTitle,
        content: buildContentWithImageNote(sectionContent, 3000, images),
      }),
      language
    );
    const text = await askGemini(prompt, 400, images);
    // The model explicitly recognized this as navigational content (table of
    // contents, agenda, cover page) with nothing to explain — respect that
    // and skip, rather than falling back to the local generator, which has
    // no way to tell a TOC from real content and would happily explain it.
    if (text.trim() === "SKIP") return null;
    return {
      strategy: inferStrategy(sectionTitle, sectionContent),
      explanation: text || "Explanation unavailable",
    };
  } catch {
    return createFallbackExplanation(sectionTitle, sectionContent);
  }
}

const MIN_PAGE_NOTE_CHARS = 20;

// A short, page-specific supplementary note — something on THIS page that
// the section-level explanation (generated once for the whole section)
// wouldn't already cover, like a specific number, example, formula, or
// diagram detail. Most pages should get null back: this is meant to
// surface the occasional page with something extra, not to explain every
// page. Skips near-empty, imageless pages locally without an AI call.
export async function generatePageNote(sectionTitle: string, page: SectionPage, language: Language = "en"): Promise<string | null> {
  const text = page.text.trim();
  const pageHasVisual = text.length < SPARSE_TEXT_THRESHOLD && !!page.thumbnailDataUrl;
  if (!pageHasVisual && text.length < MIN_PAGE_NOTE_CHARS) return null;
  if (!gemini) return null;

  try {
    const images = collectVisualParts([page]);
    const prompt = withLanguage(
      buildPrompt("pageNote", {
        sectionTitle,
        content: buildContentWithImageNote(text, 2000, images),
      }),
      language
    );
    const responseText = (await askGemini(prompt, 200, images)).trim();
    if (!responseText || responseText.toUpperCase() === "NONE") return null;
    return responseText;
  } catch {
    return null;
  }
}

// Returns null when the section is too trivial to be worth a quiz — same gate as generateExplanation.
export async function generateQuiz(sectionTitle: string, pages: SectionPage[], language: Language = "en"): Promise<QuizItem[] | null> {
  const sectionContent = pages.map((page) => page.text).join("\n\n");
  const sectionHasVisuals = hasVisualContent(pages);
  if (!assessSectionRelevance(sectionTitle, sectionContent, sectionHasVisuals).needsQuiz) return null;
  if (!gemini) return createConceptQuiz(sectionTitle, sectionContent);

  try {
    const images = collectVisualParts(pages);
    const prompt = withLanguage(
      buildPrompt("quizGeneration", {
        title: sectionTitle,
        content: buildContentWithImageNote(sectionContent, 3000, images),
      }),
      language
    );
    const text = await askGemini(prompt, 1536, images);
    const parsed = parseJsonLoose(text) as { questions?: unknown } | null;
    // The model explicitly recognized this as navigational content (table of
    // contents, agenda, cover page) with nothing worth quizzing — respect
    // that and skip, rather than falling back to the local generator, which
    // has no way to tell a TOC from real content and would happily quiz it.
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length === 0) return null;
    const normalized = normalizeQuizItems(parsed, "quiz");
    return normalized ? normalized.slice(0, 3) : createConceptQuiz(sectionTitle, sectionContent);
  } catch {
    return createConceptQuiz(sectionTitle, sectionContent);
  }
}

// Generates another batch of quiz questions for a section the student already
// has a quiz for, explicitly telling the model what's already been asked —
// question AND answer, so it can recognize the same underlying fact even
// asked a different way (e.g. a past multiple-choice turned into true/false).
// The model doesn't reliably self-police that over repeated rounds, so this
// also asks for up to 5 candidates and runs them through isDuplicateFact
// itself, keeping the first 3 that survive (fewer if the material's running
// out of untapped facts). Can be called repeatedly — each call gets a fresh
// id prefix and re-checks against the full accumulated list the caller passes in.
export async function generateMoreQuiz(sectionTitle: string, pages: SectionPage[], existingQuestions: ExistingQuizFact[], language: Language = "en"): Promise<QuizItem[]> {
  const sectionContent = pages.map((page) => page.text).join("\n\n");
  const idPrefix = `more-${Date.now()}`;

  if (!gemini) {
    return createConceptQuiz(sectionTitle, sectionContent)
      .filter((item) => !isDuplicateFact(item, existingQuestions))
      .map((item, index) => ({ ...item, id: `${idPrefix}-${index + 1}` }));
  }

  try {
    const images = collectVisualParts(pages);
    const existingList =
      existingQuestions.length > 0
        ? existingQuestions.map((q, i) => `${i + 1}. Q: ${q.question}\n   A: ${q.correctAnswer}`).join("\n")
        : "(none yet)";
    const prompt = withLanguage(
      buildPrompt("moreQuiz", {
        title: sectionTitle,
        content: buildContentWithImageNote(sectionContent, 3000, images),
        existingQuestions: existingList,
      }),
      language
    );
    const text = await askGemini(prompt, 2200, images);
    const normalized = normalizeQuizItems(parseJsonLoose(text), idPrefix);
    if (!normalized) return [];

    // Filter against the existing list AND against candidates already
    // accepted from this same batch, so two near-duplicate candidates in one
    // response don't both slip through.
    const accepted: QuizItem[] = [];
    for (const candidate of normalized) {
      if (accepted.length >= 3) break;
      if (isDuplicateFact(candidate, existingQuestions) || isDuplicateFact(candidate, accepted)) continue;
      accepted.push(candidate);
    }
    return accepted;
  } catch {
    return [];
  }
}

export interface ConceptPage {
  num: number;
  text: string;
}

export interface ConceptSection {
  title: string;
  pageNumbers: number[];
}

// Reads the whole document and asks the model to mark where one concept ends
// and the next begins, instead of chopping it into fixed-size page chunks.
// Returns null (caller falls back to the heuristic splitter) if there's no
// API key, the call fails, or the model's boundaries don't cleanly cover
// every page exactly once.
export async function segmentIntoConcepts(pages: ConceptPage[]): Promise<ConceptSection[] | null> {
  if (!gemini || pages.length === 0) return null;

  try {
    const pageList = pages.map((page) => `--- Page ${page.num} ---\n${page.text.slice(0, 1500)}`).join("\n\n");
    const prompt = buildPrompt("conceptSegmentation", { pageList });
    const text = await askGemini(prompt, Math.min(8192, 1024 + pages.length * 40));

    const parsed = parseJsonLoose(text) as { sections?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.sections)) return null;

    const raw = parsed.sections as Array<{ title?: unknown; startPage?: unknown; endPage?: unknown }>;
    const validPageNumbers = new Set(pages.map((page) => page.num));
    const seenPages = new Set<number>();
    const sections: ConceptSection[] = [];

    for (const entry of raw) {
      const start = typeof entry.startPage === "number" ? entry.startPage : NaN;
      const end = typeof entry.endPage === "number" ? entry.endPage : NaN;
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!title || !Number.isInteger(start) || !Number.isInteger(end) || start > end) return null;

      const pageNumbers: number[] = [];
      for (let n = start; n <= end; n += 1) {
        if (!validPageNumbers.has(n) || seenPages.has(n)) return null;
        seenPages.add(n);
        pageNumbers.push(n);
      }
      sections.push({ title, pageNumbers });
    }

    return sections.length > 0 && seenPages.size === pages.length ? sections : null;
  } catch {
    return null;
  }
}

export async function generateReviewQuiz(rangeTitle: string, rangeContent: string, language: Language = "en"): Promise<QuizItem[]> {
  if (!gemini) return createReviewQuiz(rangeTitle, rangeContent);

  try {
    const prompt = withLanguage(buildPrompt("finalReview", { title: rangeTitle, content: rangeContent.slice(0, 6000) }), language);
    const text = await askGemini(prompt, 4096);
    const normalized = normalizeQuizItems(parseJsonLoose(text), "review");
    return normalized && normalized.length >= 6 ? normalized.slice(0, 10) : createReviewQuiz(rangeTitle, rangeContent);
  } catch {
    return createReviewQuiz(rangeTitle, rangeContent);
  }
}

// Same "add more" pattern as generateMoreQuiz, scoped to the whole study
// range instead of one section — used by the Final Review screen's "add
// more questions" button, which stays available even after the student has
// submitted once (newly added questions just aren't revealed until the next submit).
export async function generateMoreReviewQuiz(rangeTitle: string, rangeContent: string, existingQuestions: ExistingQuizFact[], language: Language = "en"): Promise<QuizItem[]> {
  const idPrefix = `more-review-${Date.now()}`;

  if (!gemini) {
    return createReviewQuiz(rangeTitle, rangeContent)
      .filter((item) => !isDuplicateFact(item, existingQuestions))
      .slice(0, 5)
      .map((item, index) => ({ ...item, id: `${idPrefix}-${index + 1}` }));
  }

  try {
    const existingList =
      existingQuestions.length > 0
        ? existingQuestions.map((q, i) => `${i + 1}. Q: ${q.question}\n   A: ${q.correctAnswer}`).join("\n")
        : "(none yet)";
    const prompt = withLanguage(
      buildPrompt("moreReviewQuiz", {
        title: rangeTitle,
        content: rangeContent.slice(0, 6000),
        existingQuestions: existingList,
      }),
      language
    );
    const text = await askGemini(prompt, 3000);
    const normalized = normalizeQuizItems(parseJsonLoose(text), idPrefix);
    if (!normalized) return [];

    const accepted: QuizItem[] = [];
    for (const candidate of normalized) {
      if (accepted.length >= 5) break;
      if (isDuplicateFact(candidate, existingQuestions) || isDuplicateFact(candidate, accepted)) continue;
      accepted.push(candidate);
    }
    return accepted;
  } catch {
    return [];
  }
}

export async function generateChatAnswer(question: string, sectionTitle: string, pages: SectionPage[], language: Language = "en"): Promise<string> {
  const sectionContent = pages.map((page) => page.text).join("\n\n");
  if (!gemini) {
    return `For ${sectionTitle}, the key idea is to connect the concept to the section content. ${question} can be answered by focusing on the main takeaway and the example from the PDF. If you want, I can also help turn this into a memory cue.`;
  }

  try {
    const images = collectVisualParts(pages);
    const prompt = withLanguage(
      buildPrompt("chatAssistant", {
        title: sectionTitle,
        content: buildContentWithImageNote(sectionContent, 4000, images),
        question,
      }),
      language
    );
    const text = await askGemini(`${prompt}\n\nQuestion: ${question}`, 1024, images);
    return text || "I can help you unpack that concept.";
  } catch {
    return `I’m using the section context to answer your question. The main idea is to connect the core concept to a simple example so it is easier to remember.`;
  }
}
