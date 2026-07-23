"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "./AppHeader";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { DirectoryListing } from "@/lib/types";

interface DirectoryBrowserProps {
  user: { name?: string | null; image?: string | null };
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

type StudyStatus = "not-started" | "in-progress" | "completed";

function getStudyStatus(doc: { lastOpenedAt: string | null; completedAt: string | null }): StudyStatus {
  if (doc.completedAt) return "completed";
  if (doc.lastOpenedAt) return "in-progress";
  return "not-started";
}

const STATUS_LABEL_KEY: Record<StudyStatus, TranslationKey> = {
  "not-started": "directory.statusNotStarted",
  "in-progress": "directory.statusInProgress",
  completed: "directory.statusCompleted",
};

const STATUS_BADGE_STYLE: Record<StudyStatus, string> = {
  "not-started": "bg-slate-100 text-slate-500",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

const STATUS_BORDER_STYLE: Record<StudyStatus, string> = {
  "not-started": "border-slate-200",
  "in-progress": "border-amber-300",
  completed: "border-green-300",
};

export default function DirectoryBrowser({ user }: DirectoryBrowserProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [listingsByFolder, setListingsByFolder] = useState<Record<string, DirectoryListing>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const folderKey = folderId ?? "root";
  const listing = listingsByFolder[folderKey] ?? null;
  const isLoading = !(folderKey in listingsByFolder);

  // Fetches once per folder and caches by id; re-fetch after a mutation (new
  // folder, upload) by dropping that folder's entry from the cache below.
  useEffect(() => {
    if (folderKey in listingsByFolder) return;

    let cancelled = false;
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    fetch(`/api/folders${query}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setListingsByFolder((prev) => ({ ...prev, [folderKey]: data }));
      })
      .catch(() => {
        if (!cancelled) setError(t("directory.failedLoadFolder"));
      });

    return () => {
      cancelled = true;
    };
  }, [folderId, folderKey, listingsByFolder, t]);

  function invalidateCurrentFolder() {
    setListingsByFolder((prev) => {
      const next = { ...prev };
      delete next[folderKey];
      return next;
    });
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentFolderId: folderId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("directory.failedCreateFolder"));
      setNewFolderName("");
      setIsCreatingFolder(false);
      invalidateCurrentFolder();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("directory.failedCreateFolder"));
    }
  }

  async function uploadOne(file: File): Promise<{ status: "ok" | "duplicate" | "error"; documentId?: string; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folderId", folderId);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();

    if (response.status === 409) {
      return { status: "duplicate", message: `${file.name}: ${payload.error}` };
    }
    if (!response.ok || !payload.documentId) {
      return { status: "error", message: `${file.name}: ${payload.error || t("directory.uploadFailed")}` };
    }
    return { status: "ok", documentId: payload.documentId, message: file.name };
  }

  async function handleDeleteFolder(event: React.MouseEvent, folder: { id: string; name: string }) {
    event.stopPropagation();
    if (!window.confirm(t("directory.deleteFolderConfirm", { name: folder.name }))) return;

    try {
      const response = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("directory.failedDeleteFolder"));
      invalidateCurrentFolder();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("directory.failedDeleteFolder"));
    }
  }

  async function handleDeleteDocument(event: React.MouseEvent, doc: { id: string; filename: string }) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(t("directory.deleteDocumentConfirm", { name: doc.filename }))) return;

    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("directory.failedDeleteDocument"));
      invalidateCurrentFolder();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("directory.failedDeleteDocument"));
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setNotice(null);

    // Uploaded one at a time — each one runs an AI concept-segmentation call,
    // and doing them concurrently would just race for the same rate-limited quota.
    const results: Array<Awaited<ReturnType<typeof uploadOne>>> = [];
    for (let i = 0; i < files.length; i += 1) {
      setUploadProgress({ done: i, total: files.length });
      results.push(await uploadOne(files[i]));
    }
    setUploadProgress(null);
    setIsUploading(false);
    invalidateCurrentFolder();

    const succeeded = results.filter((r) => r.status === "ok");
    const skipped = results.filter((r) => r.status !== "ok");

    if (succeeded.length === 1 && skipped.length === 0) {
      router.push(`/study/${succeeded[0].documentId}`);
      return;
    }

    if (skipped.length > 0) {
      setError(skipped.map((r) => r.message).join("\n"));
    }
    if (succeeded.length > 0) {
      setNotice(t("directory.uploadedFiles", { count: succeeded.length }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppHeader title={t("directory.title")} subtitle={t("directory.subtitle")} user={user} />

        {listing && (
          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
            {listing.breadcrumb.map((crumb, index) => (
              <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                {index > 0 && <span className="text-slate-300">/</span>}
                <button
                  onClick={() => setFolderId(crumb.id)}
                  className={`rounded-full px-2 py-1 hover:bg-slate-100 ${index === listing.breadcrumb.length - 1 ? "font-semibold text-slate-900" : ""}`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <input
              type="file"
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
            {isUploading
              ? uploadProgress
                ? t("directory.uploadingProgress", { done: uploadProgress.done + 1, total: uploadProgress.total })
                : t("directory.uploading")
              : t("directory.uploadPdf")}
          </label>

          {isCreatingFolder ? (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleCreateFolder()}
                placeholder={t("directory.folderNamePlaceholder")}
                className="w-40 rounded-full px-2 py-1 text-sm outline-none"
              />
              <button onClick={handleCreateFolder} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {t("directory.create")}
              </button>
              <button onClick={() => setIsCreatingFolder(false)} className="px-2 text-xs text-slate-400">
                {t("directory.cancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("directory.newFolder")}
            </button>
          )}
        </div>

        {error && <div className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}

        {isLoading && !listing ? (
          <p className="text-sm text-slate-500">{t("directory.loading")}</p>
        ) : listing && listing.folders.length === 0 && listing.documents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
            {t("directory.emptyFolder")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listing?.folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setFolderId(folder.id)}
                className="group relative flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-blue-400 hover:bg-blue-50"
              >
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleDeleteFolder(event, folder)}
                  onKeyDown={(event) => event.key === "Enter" && handleDeleteFolder(event as unknown as React.MouseEvent, folder)}
                  className="absolute right-2 top-2 rounded-full p-1.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  aria-label={t("directory.deleteFolderAriaLabel", { name: folder.name })}
                >
                  🗑
                </span>
                <span className="text-3xl">📁</span>
                <span className="w-full truncate text-sm font-medium text-slate-800">{folder.name}</span>
              </button>
            ))}

            {listing?.documents.map((doc) => {
              const status = getStudyStatus(doc);
              return (
                <Link
                  key={doc.id}
                  href={`/study/${doc.id}`}
                  className={`group relative flex flex-col gap-2 rounded-2xl border-2 bg-white p-4 hover:border-blue-400 hover:bg-blue-50 ${STATUS_BORDER_STYLE[status]}`}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => handleDeleteDocument(event, doc)}
                    onKeyDown={(event) => event.key === "Enter" && handleDeleteDocument(event as unknown as React.MouseEvent, doc)}
                    className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    aria-label={t("directory.deleteDocumentAriaLabel", { name: doc.filename })}
                  >
                    🗑
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_STYLE[status]}`}>
                      {t(STATUS_LABEL_KEY[status])}
                      {status === "completed" && doc.lastReviewScore !== null && t("directory.scoreSuffix", { score: doc.lastReviewScore })}
                    </span>
                  </div>
                  {doc.thumbnailDataUrl ? (
                    <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.thumbnailDataUrl} alt={doc.filename} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-slate-50 text-3xl">📄</div>
                  )}
                  <span className="truncate text-sm font-medium text-slate-800">{doc.filename}</span>
                  <span className="text-xs text-slate-400">
                    {doc.lastPageNumber
                      ? t("viewer.pageProgress", { current: doc.lastPageNumber, total: doc.pageCount })
                      : t("directory.pagesCount", { count: doc.pageCount })}
                    {doc.lastOpenedAt && ` · ${formatDate(doc.lastOpenedAt)}`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
