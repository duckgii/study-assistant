import { NextRequest, NextResponse } from "next/server";
import { generateChatAnswer, type Language } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const { question, sectionTitle, pages, language } = await request.json();
  const lang: Language = language === "ko" ? "ko" : "en";
  const answer = await generateChatAnswer(question, sectionTitle, pages || [], lang);
  return NextResponse.json({ answer });
}
