import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CONTACT } from "@/lib/contact";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;

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
    const result = await sendEmail({
      to,
      name,
      email,
      message,
      subject,
      extraLines: [`Account: ${session.user.email || session.user.id}`],
    });

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
