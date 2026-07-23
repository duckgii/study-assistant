async function sendWithResend(params: {
  to: string;
  replyTo?: string;
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
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
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

// Tries Resend first when configured (falls back to FormSubmit once on failure),
// otherwise goes straight to FormSubmit. `extraLines` are inserted into the
// Resend body only (FormSubmit already renders name/email as separate fields).
export async function sendEmail(params: {
  to: string;
  name: string;
  email: string;
  message: string;
  subject: string;
  extraLines?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const { to, name, email, message, subject, extraLines = [] } = params;
  const text = [`Name: ${name || "(none)"}`, `Reply-to: ${email || "(none)"}`, ...extraLines, "", message].join("\n");

  let result = process.env.RESEND_API_KEY
    ? await sendWithResend({ to, replyTo: email || undefined, subject, text })
    : await sendWithFormSubmit({ to, name, email, message, subject });

  if (!result.ok && process.env.RESEND_API_KEY) {
    result = await sendWithFormSubmit({ to, name, email, message, subject });
  }

  return result;
}
