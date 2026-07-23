import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CONTACT } from "@/lib/contact";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;

async function sendWithResend(params: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured." };

  const from = process.env.CONTACT_FROM_EMAIL || "Study Assistant <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: body || "Resend request failed." };
  }
  return { ok: true };
}

async function sendWithFormSubmit(params: {
  to: string;
  name: string;
  email: string;
  message: string;
  subject: string;
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(params.to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      message: params.message,
      _subject: params.subject,
      _template: "table",
      _captcha: "false",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: body || "FormSubmit request failed." };
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }

    const to = process.env.CONTACT_TO_EMAIL || CONTACT.email;
    const subject = `[Study Assistant] Inquiry from ${name}`;
    const text = [
      `Name: ${name}`,
      `Reply-to: ${email}`,
      `Account: ${session.user.email || session.user.id}`,
      "",
      message,
    ].join("\n");

    let result = process.env.RESEND_API_KEY
      ? await sendWithResend({ to, replyTo: email, subject, text })
      : await sendWithFormSubmit({ to, name, email, message, subject });

    // If Resend fails and FormSubmit is available as fallback, try once.
    if (!result.ok && process.env.RESEND_API_KEY) {
      result = await sendWithFormSubmit({ to, name, email, message, subject });
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: "Failed to send your message. Please try again later or email directly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send your message." }, { status: 500 });
  }
}
