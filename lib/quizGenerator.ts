import type { QuizItem } from "./ai";

export interface ExtractedTerm {
  term: string;
  definition: string;
}

export const APPLIED_PATTERN = /\b(example|case study|applying|apply|exercise|scenario|practice|walkthrough|demonstrat)\b/i;

const BULLET_PATTERN = /[•▪●○◦‣∙·]/;
const PROSE_DEFINITION_PATTERN = /^([A-Z][A-Za-z0-9 /()'-]{2,40}?)\s+(?:is|are|represents|shows|means|refers to|indicates)\s+(.{10,150}?)[.?!]?$/;
const STOPWORDS = new Set(["The", "This", "That", "These", "Those", "Each", "When", "Which", "Where", "There", "Also", "Such", "With", "From", "Into", "Their", "Other"]);
const JUNK_PATTERN = /©|copyright|all rights reserved|mcgraw|^\s*(:[A-Za-z]+\s*){2,}$/i;

export function classifyConceptRole(content: string): "core" | "applied" {
  return APPLIED_PATTERN.test(content) ? "applied" : "core";
}

// PDF text extraction yields one raw "line" per visual line in the layout,
// so a wrapped sentence often arrives as two separate lines with no ending
// punctuation on the first. Rejoin lines that don't look complete (no
// terminal punctuation, no bullet marker) with what follows before treating
// them as candidate facts/definitions.
function splitToCandidateLines(content: string): string[] {
  const merged: string[] = [];
  let buffer = "";

  content.split(/\n+/).forEach((rawLine) => {
    const trimmed = rawLine.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    const looksComplete = /[.!?]$/.test(trimmed) || BULLET_PATTERN.test(trimmed) || buffer.length > 180;
    if (looksComplete) {
      merged.push(buffer);
      buffer = "";
    }
  });
  if (buffer) merged.push(buffer);

  const pieces: string[] = [];
  merged.forEach((line) => {
    if (line.length <= 220) {
      pieces.push(line);
    } else {
      line
        .split(/(?<=[.?!])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .forEach((sentence) => pieces.push(sentence));
    }
  });
  return pieces;
}

function extractFacts(content: string): string[] {
  const facts = splitToCandidateLines(content)
    .map((line) => line.replace(BULLET_PATTERN, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 20 && line.length <= 200 && /[A-Za-z]{4,}/.test(line) && !JUNK_PATTERN.test(line));
  return Array.from(new Set(facts));
}

// The most substantive-looking fact in the pool — used as a last-resort
// answer when no clean term/definition pair could be extracted, so we don't
// fall back to whatever line happened to come first (often a header or
// citation).
function bestFact(facts: string[]): string | undefined {
  return [...facts].sort((a, b) => b.length - a.length)[0];
}

function extractDefinitions(content: string): ExtractedTerm[] {
  const results: ExtractedTerm[] = [];

  splitToCandidateLines(content).forEach((line) => {
    const bulletMatch = line.match(BULLET_PATTERN);
    if (bulletMatch && bulletMatch.index !== undefined && bulletMatch.index > 2 && bulletMatch.index < 45) {
      const term = line.slice(0, bulletMatch.index).trim();
      const definition = line.slice(bulletMatch.index + 1).trim();
      if (term.length >= 3 && term.length <= 45 && definition.length >= 6 && definition.length <= 160) {
        results.push({ term, definition });
        return;
      }
    }
    const proseMatch = line.match(PROSE_DEFINITION_PATTERN);
    if (proseMatch) {
      results.push({ term: proseMatch[1].trim(), definition: proseMatch[2].trim() });
    }
  });

  const seen = new Set<string>();
  return results.filter((item) => {
    const key = item.term.toLowerCase();
    if (seen.has(key) || item.term.split(/\s+/).length > 6) return false;
    if (JUNK_PATTERN.test(item.term) || JUNK_PATTERN.test(item.definition)) return false;
    seen.add(key);
    return true;
  });
}

function extractKeywords(content: string): string[] {
  const matches = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
  return Array.from(new Set(matches.filter((word) => !STOPWORDS.has(word))));
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDefinitionQuestion(id: string, title: string, definitions: ExtractedTerm[], facts: string[], difficulty: QuizItem["difficulty"] = "easy"): QuizItem {
  const pool = shuffle(definitions);
  const target = pool[0];

  if (!target) {
    return {
      id,
      type: "short-answer",
      question: `In your own words, what is the central idea behind "${title}"?`,
      correctAnswer: bestFact(facts) || title,
      explanation: "A good definition captures what the concept is and what makes it distinct from related ideas.",
      difficulty,
    };
  }

  const distractorPool = Array.from(new Set(pool.slice(1).map((item) => item.definition).concat(facts.filter((fact) => fact !== target.definition))));
  const distractors = shuffle(distractorPool).slice(0, 2);

  if (distractors.length < 2) {
    return {
      id,
      type: "short-answer",
      question: `What does "${target.term}" mean, based on this material?`,
      correctAnswer: target.definition,
      explanation: `The material describes "${target.term}" as: ${target.definition}`,
      difficulty,
    };
  }

  return {
    id,
    type: "multiple-choice",
    question: `Which statement best defines "${target.term}"?`,
    options: shuffle([target.definition, ...distractors]),
    correctAnswer: target.definition,
    explanation: `"${target.term}" ${target.definition}`,
    difficulty,
  };
}

function buildComprehensionQuestion(id: string, title: string, facts: string[], keywords: string[], difficulty: QuizItem["difficulty"] = "medium"): QuizItem {
  const candidates = facts.filter((fact) => keywords.some((keyword) => fact.includes(keyword)));
  const pool = candidates.length > 0 ? candidates : facts;

  const fact = pool[Math.floor(Math.random() * pool.length)];
  const keyword = fact ? keywords.find((candidate) => fact.includes(candidate)) : undefined;
  const otherKeywords = keyword ? shuffle(keywords.filter((candidate) => candidate !== keyword)).slice(0, 2) : [];

  if (!fact || !keyword || otherKeywords.length < 1) {
    return {
      id,
      type: "true-false",
      question: fact ? `True or False: "${fact}"` : `"${title}" introduces at least one idea that builds on earlier material.`,
      correctAnswer: "True",
      explanation: "This statement is drawn directly from the section's material.",
      difficulty,
    };
  }

  const blanked = fact.replace(keyword, "_____");
  return {
    id,
    type: "multiple-choice",
    question: `Fill in the blank: "${blanked}"`,
    options: shuffle([keyword, ...otherKeywords]),
    correctAnswer: keyword,
    explanation: `The original statement reads: "${fact}"`,
    difficulty,
  };
}

function buildApplicationQuestion(id: string, title: string, facts: string[], difficulty: QuizItem["difficulty"] = "hard"): QuizItem {
  const appliedFacts = facts.filter((fact) => APPLIED_PATTERN.test(fact));
  const appliedFact = appliedFacts.length > 0 ? appliedFacts[Math.floor(Math.random() * appliedFacts.length)] : undefined;

  if (appliedFact) {
    return {
      id,
      type: "short-answer",
      question: `The material states: "${appliedFact}" — explain how this shows "${title}" being put into practice.`,
      correctAnswer: appliedFact,
      explanation: "A strong answer connects the general concept to this specific instance of it being used.",
      difficulty,
    };
  }

  return {
    id,
    type: "short-answer",
    question: `Describe a real situation where you would apply "${title}".`,
    correctAnswer: title,
    explanation: "Applying a concept to a new situation is a strong sign of understanding, not just memorization.",
    difficulty,
  };
}

function buildMismatchTrueFalse(id: string, definitions: ExtractedTerm[], difficulty: QuizItem["difficulty"]): QuizItem | null {
  if (definitions.length < 2) return null;
  const [a, b] = shuffle(definitions);
  const isTrue = Math.random() < 0.5;
  const statementDefinition = isTrue ? a.definition : b.definition;
  return {
    id,
    type: "true-false",
    question: `True or False: "${a.term}" ${statementDefinition}`,
    correctAnswer: isTrue ? "True" : "False",
    explanation: isTrue ? `Correct — that is how the material describes "${a.term}".` : `That description actually belongs to "${b.term}", not "${a.term}".`,
    difficulty,
  };
}

// A short (2-3 question) quiz covering one concept: what it means, whether a
// specific detail was understood, and how it gets applied. Built from real
// text extracted from the section so different concepts produce genuinely
// different questions instead of one repeated template.
export function createConceptQuiz(sectionTitle: string, sectionContent: string): QuizItem[] {
  const facts = extractFacts(sectionContent);
  const definitions = extractDefinitions(sectionContent);
  const keywords = extractKeywords(sectionContent);

  return [
    buildDefinitionQuestion("quiz-1", sectionTitle, definitions, facts, "easy"),
    buildComprehensionQuestion("quiz-2", sectionTitle, facts, keywords, "medium"),
    buildApplicationQuestion("quiz-3", sectionTitle, facts, "hard"),
  ];
}

// A 10-question review spanning the whole studied range, mixing definition,
// comprehension, and application questions across easy/medium/hard difficulty.
export function createReviewQuiz(rangeTitle: string, rangeContent: string): QuizItem[] {
  const facts = extractFacts(rangeContent);
  const definitions = extractDefinitions(rangeContent);
  const keywords = extractKeywords(rangeContent);
  const appliedFacts = facts.filter((fact) => APPLIED_PATTERN.test(fact));
  const appliedPool = appliedFacts.length > 0 ? appliedFacts : facts;

  const questions: QuizItem[] = [];
  let counter = 1;
  const nextId = () => `review-${counter++}`;

  const shuffledDefinitions = shuffle(definitions);
  for (let i = 0; i < Math.min(3, Math.max(shuffledDefinitions.length, 1)) && questions.length < 10; i += 1) {
    questions.push(buildDefinitionQuestion(nextId(), rangeTitle, shuffledDefinitions.slice(i), facts, i === 0 ? "easy" : "medium"));
  }

  for (let i = 0; i < Math.min(3, Math.floor(definitions.length / 2)) && questions.length < 10; i += 1) {
    const question = buildMismatchTrueFalse(nextId(), shuffle(definitions), i < 1 ? "easy" : "medium");
    if (question) questions.push(question);
  }

  for (let i = 0; i < 2 && questions.length < 10; i += 1) {
    questions.push(buildComprehensionQuestion(nextId(), rangeTitle, shuffle(facts), keywords, "medium"));
  }

  for (let i = 0; i < 2 && questions.length < 10; i += 1) {
    questions.push(buildApplicationQuestion(nextId(), rangeTitle, shuffle(appliedPool), "hard"));
  }

  while (questions.length < 10) {
    const fact = facts.length > 0 ? facts[questions.length % facts.length] : rangeTitle;
    questions.push({
      id: nextId(),
      type: "short-answer",
      question: `Summarize one important idea from "${rangeTitle}" in your own words.`,
      correctAnswer: fact,
      explanation: "A strong summary highlights the core idea rather than repeating the material verbatim.",
      difficulty: "medium",
    });
  }

  return questions.slice(0, 10);
}
