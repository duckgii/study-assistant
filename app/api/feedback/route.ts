import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CONTACT } from "@/lib/contact";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_TITLE_LENGTH = 300;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const documentId = typeof body.documentId === "string" ? body.documentId : null;
    const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle.trim() : "";
    const sectionTitle = typeof body.sectionTitle === "string" ? body.sectionTitle.trim() : null;
    const pageNumber = Number.isInteger(body.pageNumber) ? body.pageNumber : null;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!documentTitle || documentTitle.length > MAX_TITLE_LENGTH || pageNumber === null || pageNumber < 1) {
      return NextResponse.json({ error: "Missing page context." }, { status: 400 });
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        documentId: documentId || undefined,
        documentTitle,
        sectionTitle: sectionTitle || undefined,
        pageNumber,
        message,
      },
    });

    // Best-effort notification — the feedback is already saved above, so an
    // email hiccup shouldn't fail the request or lose the submission.
    const to = process.env.CONTACT_TO_EMAIL || CONTACT.email;
    void sendEmail({
      to,
      name: session.user.name || "",
      email: session.user.email || "",
      message,
      subject: `[Study Assistant] Page feedback — ${documentTitle} p.${pageNumber}`,
      extraLines: [
        `Document: ${documentTitle}`,
        `Page: ${pageNumber}`,
        ...(sectionTitle ? [`Section: ${sectionTitle}`] : []),
        `Account: ${session.user.email || session.user.id}`,
      ],
    });

    return NextResponse.json({ ok: true, id: feedback.id });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ feedbacks });
}
