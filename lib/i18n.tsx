"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Language = "en" | "ko";

const STORAGE_KEY = "study-assistant-language";

const dictionary = {
  en: {
    "header.home": "Home",
    "header.signOut": "Sign out",
    "header.contact": "Contact",

    "directory.title": "Your library",
    "directory.subtitle": "Study Assistant",
    "directory.newFolder": "New Folder",
    "directory.folderNamePlaceholder": "Folder name",
    "directory.create": "Create",
    "directory.cancel": "Cancel",
    "directory.uploadPdf": "Upload materials",
    "directory.uploading": "Uploading...",
    "directory.uploadingProgress": "Uploading {{done}}/{{total}}...",
    "directory.uploadedFiles": "Uploaded {{count}} file(s).",
    "directory.loading": "Loading...",
    "directory.emptyFolder": "This folder is empty. Upload a PDF or create a subfolder to get started.",
    "directory.deleteFolderConfirm": 'Delete folder "{{name}}"?\n\nSubfolders will be deleted too, but files inside will move to Home instead of being deleted.',
    "directory.deleteDocumentConfirm": 'Delete "{{name}}"?\n\nThis permanently deletes it along with your study progress and cannot be undone.',
    "directory.deleteFolderAriaLabel": "Delete {{name}}",
    "directory.deleteDocumentAriaLabel": "Delete {{name}}",
    "directory.pagesCount": "{{count}} pages",
    "directory.failedLoadFolder": "Failed to load folder.",
    "directory.failedCreateFolder": "Failed to create folder.",
    "directory.failedDeleteFolder": "Failed to delete folder.",
    "directory.failedDeleteDocument": "Failed to delete document.",
    "directory.uploadFailed": "Upload failed.",
    "directory.statusNotStarted": "Not started",
    "directory.statusInProgress": "In progress",
    "directory.statusCompleted": "Completed",
    "directory.scoreSuffix": " · {{score}} pts",

    "preLearning.step": "Step 3",
    "preLearning.title": "Before you start...",
    "preLearning.summarizing": "Summarizing the core concepts in this study range...",
    "preLearning.begin": "Begin studying",

    "quiz.true": "True",
    "quiz.false": "False",
    "quiz.typeAnswer": "Type your answer",
    "quiz.correct": "Correct. ",
    "quiz.correctAnswerPrefix": "Correct answer: {{answer}}. ",
    "quiz.modelAnswer": "Model answer: ",
    "quiz.difficultyEasy": "easy",
    "quiz.difficultyMedium": "medium",
    "quiz.difficultyHard": "hard",

    "rangeSelector.preview": "Preview",
    "rangeSelector.noPreview": "No preview available",
    "rangeSelector.step": "Step 2",
    "rangeSelector.title": "Select what you want to study",
    "rangeSelector.description": "Pick one or more sections. They'll be studied in order, with a quiz after each one. Click and drag across rows to select a range at once.",
    "rangeSelector.pageCountSingular": "{{count}} page",
    "rangeSelector.pageCountPlural": "{{count}} pages",
    "rangeSelector.startStudying": "Start studying",

    "sidebar.finalReview": "Final Review",

    "viewer.pageProgress": "Page {{current}} of {{total}}",
    "viewer.renderingPage": "Rendering page...",
    "viewer.cannotRender": "This page could not be rendered.",
    "viewer.previous": "Previous",
    "viewer.next": "Next",
    "viewer.conceptCheck": "Concept check: {{title}}",
    "viewer.conceptCheckDescription": "You've reached the end of this concept — answer these before moving on.",
    "viewer.generatingQuiz": "Generating quiz questions...",
    "viewer.noMoreSection": "No more new questions left in this section — try again?",
    "viewer.pageQuizTitle": "Quiz for this page",
    "viewer.makeQuizForPage": "Make a quiz for this page",
    "viewer.generatingPageQuiz": "Generating a quiz for this page...",
    "viewer.pageQuizUnavailable": "This page doesn't have enough content for a quiz.",
    "viewer.noMorePage": "No more new questions left on this page — try again?",

    "aiTutor.label": "AI Tutor",
    "aiTutor.hide": "Hide",
    "aiTutor.show": "Show",
    "aiTutor.preparing": "Preparing a tutor-style explanation...",
    "aiTutor.strategy": "Teaching strategy: {{strategy}}",
    "aiTutor.onPage": "On page {{page}}",

    "review.title": "Final Review",
    "review.heading": "Test what you've learned",
    "review.description": "10 questions covering the full study range, mixing easy, medium, and hard difficulty.",
    "review.generating": "Generating your review quiz...",
    "review.submit": "Submit answers",
    "review.score": "Score: {{score}}%",
    "review.noMoreRange": "No more new questions left in this range — try again?",

    "common.generatingMore": "Generating more questions...",
    "common.addMoreQuestions": "+ Add more questions",
    "common.pageNumber": "Page {{num}}",

    "chat.askAi": "Ask AI",
    "chat.studyChat": "Study chat",
    "chat.close": "Close",
    "chat.askAnything": "Ask anything about {{title}}.",
    "chat.thinking": "Thinking...",
    "chat.askQuestionPlaceholder": "Ask a question",
    "chat.send": "Send",
    "chat.noAnswer": "I couldn't find an answer for that.",
    "chat.error": "Something went wrong answering that question.",

    "login.brand": "Study Assistant",
    "login.heading": "Sign in to continue",
    "login.description": "Your uploaded PDFs, folders, and study progress are saved to your account.",
    "login.signInGoogle": "Sign in with Google",

    "studyFlow.backToHome": "Back to Home",
    "studyFlow.loadingDocument": "Loading document...",
    "studyFlow.loadFailed": "Failed to load this document.",
    "studyFlow.activeDocument": "Active Document",
    "studyFlow.tabPreLearning": "Pre-learning",
    "studyFlow.tabStudy": "Study",
    "studyFlow.tabReview": "Final Review",

    "contact.title": "Contact",
    "contact.subtitle": "Get in touch",
    "contact.stripTitle": "Questions or feedback?",
    "contact.stripDescription": "Reach me anytime — or send a message from the inquiry form.",
    "contact.stripCta": "Write an inquiry",
    "contact.reachMe": "Contact info",
    "contact.reachMeDescription": "Prefer email or social? Use any of these channels.",
    "contact.emailLabel": "Email",
    "contact.formTitle": "Send an inquiry",
    "contact.formDescription": "Your message will be emailed to me. I’ll get back to you as soon as I can.",
    "contact.name": "Name",
    "contact.email": "Your email",
    "contact.message": "Message",
    "contact.messagePlaceholder": "What would you like to ask?",
    "contact.send": "Send message",
    "contact.sending": "Sending...",
    "contact.sent": "Thanks — your inquiry was sent.",
    "contact.sendFailed": "Couldn’t send your message. Please try again or email me directly.",
    "contact.backHome": "Back to home",

    "footer.feedback": "Feedback",
    "footer.title": "Send feedback",
    "footer.description": "Found a bug or have an idea? Let me know.",
    "footer.emailOptional": "Your email (optional)",
    "footer.messagePlaceholder": "What's on your mind?",
    "footer.send": "Send",
    "footer.sending": "Sending...",
    "footer.sent": "Thanks for the feedback!",
    "footer.sendFailed": "Couldn't send feedback. Please try again later.",
    "footer.close": "Close",
  },
  ko: {
    "header.home": "홈",
    "header.signOut": "로그아웃",
    "header.contact": "문의",

    "directory.title": "내 라이브러리",
    "directory.subtitle": "학습 도우미",
    "directory.newFolder": "새 폴더",
    "directory.folderNamePlaceholder": "폴더 이름",
    "directory.create": "만들기",
    "directory.cancel": "취소",
    "directory.uploadPdf": "자료 업로드",
    "directory.uploading": "업로드 중...",
    "directory.uploadingProgress": "{{done}}/{{total}} 업로드 중...",
    "directory.uploadedFiles": "{{count}}개 파일 업로드 완료.",
    "directory.loading": "불러오는 중...",
    "directory.emptyFolder": "이 폴더는 비어 있습니다. PDF를 업로드하거나 하위 폴더를 만들어 시작하세요.",
    "directory.deleteFolderConfirm": '"{{name}}" 폴더를 삭제할까요?\n\n하위 폴더는 함께 삭제되지만, 안에 있는 파일은 삭제되지 않고 홈으로 이동합니다.',
    "directory.deleteDocumentConfirm": '"{{name}}"을(를) 삭제할까요?\n\n학습 기록을 포함해 완전히 삭제되며 되돌릴 수 없습니다.',
    "directory.deleteFolderAriaLabel": "{{name}} 삭제",
    "directory.deleteDocumentAriaLabel": "{{name}} 삭제",
    "directory.pagesCount": "{{count}}쪽",
    "directory.failedLoadFolder": "폴더를 불러오지 못했습니다.",
    "directory.failedCreateFolder": "폴더를 만들지 못했습니다.",
    "directory.failedDeleteFolder": "폴더를 삭제하지 못했습니다.",
    "directory.failedDeleteDocument": "문서를 삭제하지 못했습니다.",
    "directory.uploadFailed": "업로드에 실패했습니다.",
    "directory.statusNotStarted": "학습 전",
    "directory.statusInProgress": "학습 중",
    "directory.statusCompleted": "학습 완료",
    "directory.scoreSuffix": " · {{score}}점",

    "preLearning.step": "3단계",
    "preLearning.title": "시작하기 전에...",
    "preLearning.summarizing": "학습 범위의 핵심 개념을 요약하는 중...",
    "preLearning.begin": "학습 시작",

    "quiz.true": "참",
    "quiz.false": "거짓",
    "quiz.typeAnswer": "답을 입력하세요",
    "quiz.correct": "정답입니다. ",
    "quiz.correctAnswerPrefix": "정답: {{answer}}. ",
    "quiz.modelAnswer": "모범 답안: ",
    "quiz.difficultyEasy": "쉬움",
    "quiz.difficultyMedium": "보통",
    "quiz.difficultyHard": "어려움",

    "rangeSelector.preview": "미리보기",
    "rangeSelector.noPreview": "미리보기를 사용할 수 없습니다",
    "rangeSelector.step": "2단계",
    "rangeSelector.title": "학습할 범위를 선택하세요",
    "rangeSelector.description": "하나 이상의 섹션을 선택하세요. 선택한 순서대로 학습하며, 각 섹션이 끝날 때마다 퀴즈가 나옵니다. 여러 개를 한 번에 선택하려면 클릭한 채로 드래그하세요.",
    "rangeSelector.pageCountSingular": "{{count}}쪽",
    "rangeSelector.pageCountPlural": "{{count}}쪽",
    "rangeSelector.startStudying": "학습 시작",

    "sidebar.finalReview": "최종 복습",

    "viewer.pageProgress": "{{total}}쪽 중 {{current}}쪽",
    "viewer.renderingPage": "페이지를 불러오는 중...",
    "viewer.cannotRender": "이 페이지를 표시할 수 없습니다.",
    "viewer.previous": "이전",
    "viewer.next": "다음",
    "viewer.conceptCheck": "개념 확인: {{title}}",
    "viewer.conceptCheckDescription": "이 개념의 마지막에 도달했습니다 — 다음으로 넘어가기 전에 답해보세요.",
    "viewer.generatingQuiz": "퀴즈 문제를 만드는 중...",
    "viewer.noMoreSection": "이 섹션에는 더 만들 수 있는 새 문제가 없습니다 — 다시 시도할까요?",
    "viewer.pageQuizTitle": "이 페이지 문제",
    "viewer.makeQuizForPage": "이 페이지로 문제 만들기",
    "viewer.generatingPageQuiz": "이 페이지의 문제를 만드는 중...",
    "viewer.pageQuizUnavailable": "이 페이지에는 문제를 만들 만한 내용이 부족합니다.",
    "viewer.noMorePage": "이 페이지에는 더 만들 수 있는 새 문제가 없습니다 — 다시 시도할까요?",

    "aiTutor.label": "AI 튜터",
    "aiTutor.hide": "숨기기",
    "aiTutor.show": "보기",
    "aiTutor.preparing": "튜터 스타일 설명을 준비하는 중...",
    "aiTutor.strategy": "학습 전략: {{strategy}}",
    "aiTutor.onPage": "{{page}}쪽에서",

    "review.title": "최종 복습",
    "review.heading": "배운 내용을 확인해보세요",
    "review.description": "전체 학습 범위를 다루는 10문제로, 쉬움·보통·어려움 난이도가 섞여 있습니다.",
    "review.generating": "복습 퀴즈를 만드는 중...",
    "review.submit": "답안 제출",
    "review.score": "점수: {{score}}%",
    "review.noMoreRange": "이 범위에는 더 만들 수 있는 새 문제가 없습니다 — 다시 시도할까요?",

    "common.generatingMore": "문제를 추가로 만드는 중...",
    "common.addMoreQuestions": "+ 문제 추가",
    "common.pageNumber": "{{num}}쪽",

    "chat.askAi": "AI에게 질문",
    "chat.studyChat": "학습 채팅",
    "chat.close": "닫기",
    "chat.askAnything": "{{title}}에 대해 무엇이든 물어보세요.",
    "chat.thinking": "생각하는 중...",
    "chat.askQuestionPlaceholder": "질문을 입력하세요",
    "chat.send": "보내기",
    "chat.noAnswer": "그에 대한 답을 찾지 못했습니다.",
    "chat.error": "답변하는 중 문제가 발생했습니다.",

    "login.brand": "학습 도우미",
    "login.heading": "로그인하고 계속하기",
    "login.description": "업로드한 PDF, 폴더, 학습 진행 상황이 계정에 저장됩니다.",
    "login.signInGoogle": "Google로 로그인",

    "studyFlow.backToHome": "홈으로 돌아가기",
    "studyFlow.loadingDocument": "문서를 불러오는 중...",
    "studyFlow.loadFailed": "이 문서를 불러오지 못했습니다.",
    "studyFlow.activeDocument": "학습 중인 문서",
    "studyFlow.tabPreLearning": "예습",
    "studyFlow.tabStudy": "학습",
    "studyFlow.tabReview": "마지막 문제풀이",

    "contact.title": "문의하기",
    "contact.subtitle": "연락처",
    "contact.stripTitle": "문의나 피드백이 있으신가요?",
    "contact.stripDescription": "아래 연락처로 바로 연락하시거나, 문의 양식으로 메시지를 보내 주세요.",
    "contact.stripCta": "문의 작성하기",
    "contact.reachMe": "연락처",
    "contact.reachMeDescription": "이메일이나 SNS로 편하게 연락해 주세요.",
    "contact.emailLabel": "이메일",
    "contact.formTitle": "문의 보내기",
    "contact.formDescription": "작성하신 내용은 제 이메일로 전달됩니다. 확인하는 대로 답변드릴게요.",
    "contact.name": "이름",
    "contact.email": "회신 받을 이메일",
    "contact.message": "문의 내용",
    "contact.messagePlaceholder": "어떤 점이 궁금하신가요?",
    "contact.send": "보내기",
    "contact.sending": "보내는 중...",
    "contact.sent": "문의가 전송되었습니다. 감사합니다.",
    "contact.sendFailed": "전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 직접 연락해 주세요.",
    "contact.backHome": "홈으로 돌아가기",

    "footer.feedback": "피드백",
    "footer.title": "피드백 보내기",
    "footer.description": "버그를 발견했거나 아이디어가 있으신가요? 알려주세요.",
    "footer.emailOptional": "이메일 (선택)",
    "footer.messagePlaceholder": "어떤 내용이든 편하게 남겨주세요",
    "footer.send": "보내기",
    "footer.sending": "보내는 중...",
    "footer.sent": "피드백 감사합니다!",
    "footer.sendFailed": "피드백을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
    "footer.close": "닫기",
  },
} as const;

export type TranslationKey = keyof typeof dictionary.en;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value)), template);
}

// Persisted language is external state (localStorage), read via
// useSyncExternalStore rather than useState+useEffect — React re-renders
// with the real client value right after hydration on its own, with no risk
// of a hydration mismatch (the server snapshot is always "en") and no
// synchronous setState-in-effect.
const listeners = new Set<() => void>();

function getSnapshot(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "ko" ? stored : "en";
}

function getServerSnapshot(): Language {
  return "en";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function persistLanguage(next: Language) {
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return interpolate(dictionary[language][key], vars);
  }

  return <LanguageContext.Provider value={{ language, setLanguage: persistLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
