import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CONTACT } from "@/lib/contact";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request: NextRequest) {
  const session = await auth();

  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }
    if (email && (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const to = process.env.CONTACT_TO_EMAIL || CONTACT.email;
    const replyTo = email || session?.user?.email || "";
    const name = session?.user?.name || "Anonymous";
    const subject = `[Study Assistant] Feedback from ${name}`;

    const result = await sendEmail({
      to,
      name,
      email: replyTo,
      message,
      subject,
      extraLines: [`Account: ${session?.user?.email || session?.user?.id || "(not signed in)"}`],
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Failed to send your feedback. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send your feedback." }, { status: 500 });
  }
}
