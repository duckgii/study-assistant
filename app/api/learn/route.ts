import { NextRequest, NextResponse } from "next/server";
import { generatePreLearning, generateExplanation, generatePageNote, generateQuiz, generateMoreQuiz, generateReviewQuiz, generateMoreReviewQuiz, type Language } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const { mode, sectionTitle, sectionContent, sections, pages, page, existingQuestions, language } = await request.json();
  const lang: Language = language === "ko" ? "ko" : "en";

  if (mode === "pre-learning") {
    const data = await generatePreLearning(sectionTitle, sections || [], lang);
    return NextResponse.json({ data });
  }

  if (mode === "explanation") {
    const data = await generateExplanation(sectionTitle, pages || [], lang);
    return NextResponse.json({ data });
  }

  if (mode === "page-note") {
    const data = page ? await generatePageNote(sectionTitle, page, lang) : null;
    return NextResponse.json({ data });
  }

  if (mode === "quiz") {
    const data = await generateQuiz(sectionTitle, pages || [], lang);
    return NextResponse.json({ data });
  }

  if (mode === "more-quiz") {
    const data = await generateMoreQuiz(sectionTitle, pages || [], existingQuestions || [], lang);
    return NextResponse.json({ data });
  }

  if (mode === "review") {
    const data = await generateReviewQuiz(sectionTitle, sectionContent, lang);
    return NextResponse.json({ data });
  }

  if (mode === "more-review") {
    const data = await generateMoreReviewQuiz(sectionTitle, sectionContent, existingQuestions || [], lang);
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}
