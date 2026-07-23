"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import StudyRangeSelector from "@/components/StudyRangeSelector";
import PreLearningCard from "@/components/PreLearningCard";
import StudySidebar from "@/components/StudySidebar";
import StudyViewer from "@/components/StudyViewer";
import ReviewCard from "@/components/ReviewCard";
import ChatWidget from "@/components/ChatWidget";
import AppHeader from "@/components/AppHeader";
import { assessSectionRelevance, hasVisualContent } from "@/lib/contentGate";
import { useLanguage, type Language } from "@/lib/i18n";
import type { DocumentDetail, ExplanationData, PageMeta, PreLearningData, QuizItem } from "@/lib/types";

type Step = "range-select" | "pre-learning" | "viewer" | "review";

interface StudyFlowProps {
  documentId: string;
  user: { name?: string | null; image?: string | null };
}

function collectPageText(doc: DocumentDetail, pageNumbers: number[]): string {
  const byNumber = new Map(doc.pages.map((page) => [page.pageNumber, page.text]));
  return pageNumbers.map((num) => byNumber.get(num) || "").join("\n\n");
}

// Same as collectPageText, but keeps each page's thumbnail alongside its text
// so pages that are mostly a diagram or photo can be sent to the model as an
// image instead of being judged from (near-empty) extracted text alone.
function collectPages(doc: DocumentDetail, pageNumbers: number[]): PageMeta[] {
  const byNumber = new Map(doc.pages.map((page) => [page.pageNumber, page]));
  return pageNumbers.map((num) => byNumber.get(num)).filter((page): page is PageMeta => Boolean(page));
}

// AI-generated content (explanations, page notes, quizzes) is cached in
// client state only, keyed by id — switching the display language needs a
// fresh generation per language, so every cache key folds the language in.
function keyed(id: string | number, language: Language): string {
  return `${id}::${language}`;
}

async function callLearn(mode: string, sectionTitle: string, payload: { pages?: PageMeta[]; page?: PageMeta; sectionContent?: string; language: Language }) {
  const response = await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, sectionTitle, ...payload }),
  });
  const data = await response.json();
  return data.data;
}

async function callPreLearning(rangeTitle: string, sections: Array<{ id: string; title: string; content: string }>, language: Language) {
  const response = await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "pre-learning", sectionTitle: rangeTitle, sections, language }),
  });
  const payload = await response.json();
  return payload.data;
}

export default function StudyFlow({ documentId, user }: StudyFlowProps) {
  const { language, t } = useLanguage();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("range-select");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number | null>(null);

  const [preLearningByLang, setPreLearningByLang] = useState<Partial<Record<Language, PreLearningData>>>({});
  const [isPreLearningLoading, setIsPreLearningLoading] = useState(false);
  const preLearningFetchLangRef = useRef<Language | null>(null);

  const [explanationsBySection, setExplanationsBySection] = useState<Record<string, ExplanationData | null>>({});
  const [pageNotesByPage, setPageNotesByPage] = useState<Record<string, string | null>>({});
  const [quizzesBySection, setQuizzesBySection] = useState<Record<string, QuizItem[] | null>>({});
  const [quizAnswersBySection, setQuizAnswersBySection] = useState<Record<string, Record<string, string>>>({});
  const [addingQuizSectionId, setAddingQuizSectionId] = useState<string | null>(null);
  const [noMoreQuizSectionId, setNoMoreQuizSectionId] = useState<string | null>(null);
  const [pageImageCache, setPageImageCache] = useState<Record<number, string>>({});

  // Manual, on-demand quiz scoped to whichever single page is open — separate
  // from the section-wide "Concept check" above, which only ever appears on a
  // section's last page. A page key absent from this map means "not
  // requested yet"; present-but-null means the content gate rejected it.
  const [pageQuizzesByPage, setPageQuizzesByPage] = useState<Record<string, QuizItem[] | null>>({});
  const [pageQuizAnswersByPage, setPageQuizAnswersByPage] = useState<Record<string, Record<string, string>>>({});
  const [generatingPageQuizKey, setGeneratingPageQuizKey] = useState<string | null>(null);
  const [addingPageQuizKey, setAddingPageQuizKey] = useState<string | null>(null);
  const [noMorePageQuizKey, setNoMorePageQuizKey] = useState<string | null>(null);

  const [reviewQuiz, setReviewQuiz] = useState<QuizItem[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});
  const [reviewScore, setReviewScore] = useState<number | null>(null);
  const [revealedReviewQuestionIds, setRevealedReviewQuestionIds] = useState<Set<string>>(new Set());
  const [isAddingMoreReview, setIsAddingMoreReview] = useState(false);
  const [noMoreReviewAvailable, setNoMoreReviewAvailable] = useState(false);
  const reviewFetchLangRef = useRef<Language | null>(null);

  // Load the document once on mount. If the student left off mid-range last
  // time (lastPageNumber set), jump straight back into the viewer instead of
  // making them re-pick a study range.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}`)
      .then((response) => response.json())
      .then((data: DocumentDetail & { error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setDoc(data);
        if (data.lastPageNumber) {
          setSelectedSectionIds(data.sections.map((section) => section.id));
          setCurrentPageNumber(data.lastPageNumber);
          setStep("viewer");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("studyFlow.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setIsDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const rangeSections = useMemo(() => {
    if (!doc) return [];
    return doc.sections.filter((section) => selectedSectionIds.includes(section.id));
  }, [doc, selectedSectionIds]);

  const rangePageNumbers = useMemo(() => rangeSections.flatMap((section) => section.pageNumbers), [rangeSections]);

  const currentSection = useMemo(() => {
    if (currentPageNumber === null) return null;
    return rangeSections.find((section) => section.pageNumbers.includes(currentPageNumber)) || null;
  }, [rangeSections, currentPageNumber]);

  const currentPage = useMemo(() => {
    if (currentPageNumber === null || !doc) return null;
    return doc.pages.find((page) => page.pageNumber === currentPageNumber) || null;
  }, [doc, currentPageNumber]);

  const pageIndexInRange = currentPageNumber !== null ? rangePageNumbers.indexOf(currentPageNumber) + 1 : 0;
  const isLastPageOfSection = currentSection ? currentSection.pageNumbers[currentSection.pageNumbers.length - 1] === currentPageNumber : false;

  const explanationKey = currentSection ? keyed(currentSection.id, language) : null;
  const quizKey = currentSection ? keyed(currentSection.id, language) : null;
  const pageKey = currentPageNumber !== null ? keyed(currentPageNumber, language) : null;
  const preLearning = preLearningByLang[language] ?? null;
  const pageQuiz = pageKey ? pageQuizzesByPage[pageKey] : undefined;

  const isImageLoading = currentPageNumber !== null && !(currentPageNumber in pageImageCache);
  const isExplanationLoading = explanationKey !== null && !(explanationKey in explanationsBySection);
  const isQuizLoading = quizKey !== null && !(quizKey in quizzesBySection);
  const isReviewLoading = step === "review" && reviewQuiz.length === 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, currentPageNumber]);

  // Persist "where the student left off" so returning to this document from
  // the directory resumes here instead of restarting the range picker.
  useEffect(() => {
    if (currentPageNumber === null) return;
    fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastPageNumber: currentPageNumber }),
    }).catch(() => {});
  }, [documentId, currentPageNumber]);

  // Fetch the full-resolution image for the current page on demand.
  useEffect(() => {
    if (step !== "viewer" || currentPageNumber === null) return;
    if (currentPageNumber in pageImageCache) return;

    let cancelled = false;
    fetch(`/api/pages/${documentId}/${currentPageNumber}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setPageImageCache((prev) => ({ ...prev, [currentPageNumber]: data.imageDataUrl || "" }));
      })
      .catch(() => {
        if (!cancelled) setPageImageCache((prev) => ({ ...prev, [currentPageNumber]: "" }));
      });

    return () => {
      cancelled = true;
    };
  }, [step, documentId, currentPageNumber, pageImageCache]);

  // Generate the concept explanation once per section per language. A local
  // relevance check runs first — trivial sections (agenda slides, references,
  // etc.) are marked skipped without ever calling the API.
  useEffect(() => {
    if (step !== "viewer" || !doc || !currentSection || !explanationKey) return;
    if (explanationKey in explanationsBySection) return;

    const pages = collectPages(doc, currentSection.pageNumbers);
    const content = pages.map((page) => page.text).join("\n\n");
    const key = explanationKey;
    let cancelled = false;

    const needsExplanation = assessSectionRelevance(currentSection.title, content, hasVisualContent(pages)).needsExplanation;
    const resultPromise = needsExplanation ? callLearn("explanation", currentSection.title, { pages, language }) : Promise.resolve(null);

    resultPromise.then((data) => {
      if (!cancelled) {
        setExplanationsBySection((prev) => ({ ...prev, [key]: data ?? null }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [step, doc, currentSection, explanationKey, explanationsBySection, language]);

  // Generate a short page-specific note for whichever page is currently open
  // — separate from the once-per-section explanation above, since that one
  // is identical no matter which page of the section you're on. Most pages
  // come back with nothing (null) and just don't show anything extra.
  useEffect(() => {
    if (step !== "viewer" || !doc || currentPageNumber === null || !pageKey) return;
    if (pageKey in pageNotesByPage) return;

    const page = doc.pages.find((p) => p.pageNumber === currentPageNumber);
    const section = currentSection;
    if (!page || !section) return;

    const key = pageKey;
    let cancelled = false;

    callLearn("page-note", section.title, { page, language }).then((data) => {
      if (!cancelled) {
        setPageNotesByPage((prev) => ({ ...prev, [key]: data ?? null }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [step, doc, currentPageNumber, currentSection, pageKey, pageNotesByPage, language]);

  // Generate the concept quiz once, when the last page of a section is reached.
  useEffect(() => {
    if (step !== "viewer" || !doc || !currentSection || !isLastPageOfSection || !quizKey) return;
    if (quizKey in quizzesBySection) return;

    const pages = collectPages(doc, currentSection.pageNumbers);
    const content = pages.map((page) => page.text).join("\n\n");
    const key = quizKey;
    let cancelled = false;

    const needsQuiz = assessSectionRelevance(currentSection.title, content, hasVisualContent(pages)).needsQuiz;
    const resultPromise = needsQuiz ? callLearn("quiz", currentSection.title, { pages, language }) : Promise.resolve(null);

    resultPromise.then((data) => {
      if (!cancelled) {
        setQuizzesBySection((prev) => ({ ...prev, [key]: data ?? null }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [step, doc, currentSection, isLastPageOfSection, quizKey, quizzesBySection, language]);

  // Fetches the pre-learning summary once per (range, language) pair. Since a
  // study session only ever has one active range, keying by language alone is
  // enough — this also fires the very first time a range is confirmed.
  useEffect(() => {
    if (!doc || rangeSections.length === 0) return;
    if (preLearningFetchLangRef.current === language) return;
    preLearningFetchLangRef.current = language;

    let cancelled = false;
    setIsPreLearningLoading(true);
    const title = rangeSections.map((section) => section.title).join(", ");
    const sectionPayload = rangeSections.map((section) => ({
      id: section.id,
      title: section.title,
      content: collectPageText(doc, section.pageNumbers),
    }));

    callPreLearning(title, sectionPayload, language)
      .then((data) => {
        if (!cancelled) setPreLearningByLang((prev) => ({ ...prev, [language]: data }));
      })
      .finally(() => {
        if (!cancelled) setIsPreLearningLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doc, rangeSections, language]);

  // Fetches (or re-fetches on a language switch) the final review quiz for
  // the whole range, resetting answers/score/reveal state along with it —
  // switching language effectively restarts the review in that language.
  useEffect(() => {
    if (!doc || rangeSections.length === 0) return;
    if (reviewFetchLangRef.current === language) return;
    reviewFetchLangRef.current = language;

    let cancelled = false;
    setReviewQuiz([]);
    setReviewAnswers({});
    setReviewScore(null);
    setRevealedReviewQuestionIds(new Set());
    setNoMoreReviewAvailable(false);

    const title = rangeSections.map((section) => section.title).join(", ");
    const content = collectPageText(doc, rangePageNumbers);

    callLearn("review", title, { sectionContent: content, language }).then((data) => {
      if (!cancelled && data) setReviewQuiz(data);
    });

    return () => {
      cancelled = true;
    };
  }, [doc, rangeSections, rangePageNumbers, language]);

  function handleConfirmRange(sectionIds: string[]) {
    if (!doc) return;
    setSelectedSectionIds(sectionIds);
    setStep("pre-learning");

    // Eagerly prefetch the first section's explanation so it's ready the
    // moment the student clicks "Begin studying" — the pre-learning and
    // review effects above pick up the rest once rangeSections updates.
    const sections = doc.sections.filter((section) => sectionIds.includes(section.id));
    const firstSection = sections[0];
    if (firstSection) {
      const firstPages = collectPages(doc, firstSection.pageNumbers);
      const firstContent = firstPages.map((page) => page.text).join("\n\n");
      const key = keyed(firstSection.id, language);
      if (assessSectionRelevance(firstSection.title, firstContent, hasVisualContent(firstPages)).needsExplanation) {
        callLearn("explanation", firstSection.title, { pages: firstPages, language }).then((data) => {
          setExplanationsBySection((prev) => (key in prev ? prev : { ...prev, [key]: data ?? null }));
        });
      } else {
        setExplanationsBySection((prev) => ({ ...prev, [key]: null }));
      }
    }
  }

  // Lets the student jump directly between the three post-range-selection
  // screens at any time, not just move forward through them once. Landing on
  // "viewer" before any page has been picked yet starts at the first page of
  // the range, same as the original "Begin studying" button.
  function handleGoToStep(target: Step) {
    if (target === "viewer" && currentPageNumber === null) {
      if (rangePageNumbers.length === 0) return;
      setCurrentPageNumber(rangePageNumbers[0]);
    }
    setStep(target);
  }

  function handleBeginStudying() {
    handleGoToStep("viewer");
  }

  function handleSelectPage(pageNumber: number) {
    setCurrentPageNumber(pageNumber);
    setStep("viewer");
  }

  function handlePrev() {
    const index = pageIndexInRange - 1;
    if (index <= 0) return;
    setCurrentPageNumber(rangePageNumbers[index - 1]);
  }

  function handleNext() {
    const index = pageIndexInRange - 1;
    if (index >= rangePageNumbers.length - 1) return;
    setCurrentPageNumber(rangePageNumbers[index + 1]);
  }

  function handleQuizAnswerChange(sectionKey: string, questionId: string, value: string) {
    setQuizAnswersBySection((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [questionId]: value },
    }));
  }

  // Generates another batch of questions for the current section's quiz,
  // telling the API every question already shown so far (including ones from
  // earlier clicks of this same button) so it doesn't repeat itself.
  async function handleAddMoreQuiz() {
    if (!doc || !currentSection || !quizKey) return;
    const sectionId = currentSection.id;
    const key = quizKey;
    const existing = quizzesBySection[key] || [];

    setAddingQuizSectionId(sectionId);
    setNoMoreQuizSectionId(null);
    try {
      const pages = collectPages(doc, currentSection.pageNumbers);
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "more-quiz",
          sectionTitle: currentSection.title,
          pages,
          language,
          existingQuestions: existing.map((item) => ({ question: item.question, correctAnswer: item.correctAnswer })),
        }),
      });
      const payload = await response.json();
      const newItems: QuizItem[] = payload.data || [];
      if (newItems.length > 0) {
        setQuizzesBySection((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...newItems] }));
      } else {
        setNoMoreQuizSectionId(key);
      }
    } finally {
      setAddingQuizSectionId((prev) => (prev === sectionId ? null : prev));
    }
  }

  // Generates a quiz scoped to just the current page, on demand — unlike the
  // section-wide quiz, this is available on every page, not only the last one.
  async function handleGeneratePageQuiz() {
    if (!doc || !currentPage || !currentSection || !pageKey) return;
    if (pageKey in pageQuizzesByPage) return;
    const key = pageKey;

    setGeneratingPageQuizKey(key);
    try {
      const data = await callLearn("quiz", currentSection.title, { pages: [currentPage], language });
      setPageQuizzesByPage((prev) => ({ ...prev, [key]: data ?? null }));
    } finally {
      setGeneratingPageQuizKey((prev) => (prev === key ? null : prev));
    }
  }

  function handlePageQuizAnswerChange(questionId: string, value: string) {
    if (!pageKey) return;
    setPageQuizAnswersByPage((prev) => ({
      ...prev,
      [pageKey]: { ...(prev[pageKey] || {}), [questionId]: value },
    }));
  }

  // Same "add more" pattern as the section-level quiz, scoped to this one page.
  async function handleAddMorePageQuiz() {
    if (!doc || !currentPage || !currentSection || !pageKey) return;
    const key = pageKey;
    const existing = pageQuizzesByPage[key] || [];

    setAddingPageQuizKey(key);
    setNoMorePageQuizKey(null);
    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "more-quiz",
          sectionTitle: currentSection.title,
          pages: [currentPage],
          language,
          existingQuestions: existing.map((item) => ({ question: item.question, correctAnswer: item.correctAnswer })),
        }),
      });
      const payload = await response.json();
      const newItems: QuizItem[] = payload.data || [];
      if (newItems.length > 0) {
        setPageQuizzesByPage((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...newItems] }));
      } else {
        setNoMorePageQuizKey(key);
      }
    } finally {
      setAddingPageQuizKey((prev) => (prev === key ? null : prev));
    }
  }

  function handleReviewAnswerChange(questionId: string, value: string) {
    setReviewAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleReviewSubmit() {
    const correct = reviewQuiz.filter((item) => (reviewAnswers[item.id] || "").trim().toLowerCase() === item.correctAnswer.trim().toLowerCase()).length;
    const score = reviewQuiz.length > 0 ? Math.round((correct / reviewQuiz.length) * 100) : 0;
    setReviewScore(score);
    // Every question currently in the quiz becomes revealed at this submit —
    // including ones added earlier that were still hidden. Any question added
    // AFTER this point (via "add more") stays out of this set until the next submit.
    setRevealedReviewQuestionIds(new Set(reviewQuiz.map((item) => item.id)));

    // Submitting the final review is what marks this document as fully
    // studied — shown as "완료" back in the directory.
    fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewScore: score }),
    }).catch(() => {});
  }

  // Generates another batch of review questions across the whole study range —
  // available even after submitting, so the student can keep practicing. Newly
  // added questions are NOT added to revealedReviewQuestionIds, so they stay
  // hidden until the next submit even though earlier questions are already revealed.
  async function handleAddMoreReview() {
    if (!doc || rangeSections.length === 0) return;
    setIsAddingMoreReview(true);
    setNoMoreReviewAvailable(false);
    try {
      const title = rangeSections.map((section) => section.title).join(", ");
      const content = collectPageText(doc, rangePageNumbers);
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "more-review",
          sectionTitle: title,
          sectionContent: content,
          language,
          existingQuestions: reviewQuiz.map((item) => ({ question: item.question, correctAnswer: item.correctAnswer })),
        }),
      });
      const payload = await response.json();
      const newItems: QuizItem[] = payload.data || [];
      if (newItems.length > 0) {
        setReviewQuiz((prev) => [...prev, ...newItems]);
      } else {
        setNoMoreReviewAvailable(true);
      }
    } finally {
      setIsAddingMoreReview(false);
    }
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div>
          <p className="text-lg font-semibold">{loadError}</p>
          <Link href="/" className="mt-4 inline-block rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {t("studyFlow.backToHome")}
          </Link>
        </div>
      </main>
    );
  }

  if (isDocLoading || !doc) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <p>{t("studyFlow.loadingDocument")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppHeader title={doc.filename} subtitle={t("studyFlow.activeDocument")} user={user} />

        {step !== "range-select" && (
          <div className="flex items-center gap-1 self-start rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                ["pre-learning", t("studyFlow.tabPreLearning")],
                ["viewer", t("studyFlow.tabStudy")],
                ["review", t("studyFlow.tabReview")],
              ] as const
            ).map(([target, label]) => (
              <button
                key={target}
                onClick={() => handleGoToStep(target)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  step === target ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {step === "range-select" && (
          <StudyRangeSelector filename={doc.filename} pages={doc.pages} sections={doc.sections} onConfirm={handleConfirmRange} />
        )}

        {step === "pre-learning" && <PreLearningCard data={preLearning} isLoading={isPreLearningLoading} onBegin={handleBeginStudying} />}

        {step === "viewer" && currentPage && currentSection && explanationKey && quizKey && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <StudySidebar sections={rangeSections} pages={doc.pages} currentPageNumber={currentPageNumber} isReviewActive={false} onSelectPage={handleSelectPage} onSelectReview={() => setStep("review")} />
            <StudyViewer
              page={currentPage}
              section={currentSection}
              pageIndexInRange={pageIndexInRange}
              totalPagesInRange={rangePageNumbers.length}
              imageDataUrl={currentPageNumber !== null ? pageImageCache[currentPageNumber] || null : null}
              isImageLoading={isImageLoading}
              explanation={explanationsBySection[explanationKey] || null}
              isExplanationLoading={isExplanationLoading}
              pageNote={pageKey ? pageNotesByPage[pageKey] ?? null : null}
              quiz={quizzesBySection[quizKey] || null}
              isQuizLoading={isQuizLoading}
              isLastPageOfSection={isLastPageOfSection}
              quizAnswers={quizAnswersBySection[quizKey] || {}}
              onQuizAnswerChange={(questionId, value) => handleQuizAnswerChange(quizKey, questionId, value)}
              onAddMoreQuiz={handleAddMoreQuiz}
              isAddingMoreQuiz={addingQuizSectionId === currentSection.id}
              noMoreQuizAvailable={noMoreQuizSectionId === quizKey}
              pageQuiz={pageQuiz}
              isGeneratingPageQuiz={generatingPageQuizKey === pageKey}
              pageQuizAnswers={(pageKey && pageQuizAnswersByPage[pageKey]) || {}}
              onPageQuizAnswerChange={handlePageQuizAnswerChange}
              onGeneratePageQuiz={handleGeneratePageQuiz}
              onAddMorePageQuiz={handleAddMorePageQuiz}
              isAddingMorePageQuiz={addingPageQuizKey === pageKey}
              noMorePageQuizAvailable={noMorePageQuizKey === pageKey}
              onPrev={handlePrev}
              onNext={handleNext}
              canGoPrev={pageIndexInRange > 1}
              canGoNext={pageIndexInRange < rangePageNumbers.length}
            />
          </div>
        )}

        {step === "review" && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <StudySidebar sections={rangeSections} pages={doc.pages} currentPageNumber={currentPageNumber} isReviewActive onSelectPage={handleSelectPage} onSelectReview={() => setStep("review")} />
            <ReviewCard
              quiz={reviewQuiz}
              isLoading={isReviewLoading}
              answers={reviewAnswers}
              onAnswerChange={handleReviewAnswerChange}
              score={reviewScore}
              onSubmit={handleReviewSubmit}
              revealedQuestionIds={revealedReviewQuestionIds}
              onAddMoreQuestions={handleAddMoreReview}
              isAddingMore={isAddingMoreReview}
              noMoreAvailable={noMoreReviewAvailable}
            />
          </div>
        )}
      </div>

      <ChatWidget
        contextTitle={currentSection?.title || doc.filename}
        contextPages={currentSection ? collectPages(doc, currentSection.pageNumbers) : collectPages(doc, rangePageNumbers)}
      />
    </main>
  );
}
