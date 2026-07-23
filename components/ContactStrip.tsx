"use client";

import Link from "next/link";
import { CONTACT } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n";

// Shown on the signed-in home screen: contact channels + a path to the inquiry form.
export default function ContactStrip() {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t("contact.stripTitle")}</h3>
          <p className="mt-1 text-sm text-slate-600">{t("contact.stripDescription")}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </a>
            <a className="text-blue-600 hover:underline" href={CONTACT.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="text-blue-600 hover:underline" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t("contact.stripCta")}
        </Link>
      </div>
    </section>
  );
}
