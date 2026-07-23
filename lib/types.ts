import type { PreLearningOutput, ExplanationOutput, QuizItem } from "./ai";
import type { SectionMeta } from "./sectioning";

export type PreLearningData = PreLearningOutput;
export type ExplanationData = ExplanationOutput;
export type { QuizItem, SectionMeta };

export interface PageMeta {
  pageNumber: number;
  text: string;
  thumbnailDataUrl: string;
  sectionId: string;
}

// What /api/upload returns right after a file is uploaded.
export interface UploadResult {
  documentId: string;
  filename: string;
  pages: PageMeta[];
  sections: SectionMeta[];
}

// What GET /api/documents/[documentId] returns — the full study payload for
// a document that already exists in the directory.
export interface DocumentDetail {
  documentId: string;
  filename: string;
  lastPageNumber: number | null;
  pages: PageMeta[];
  sections: SectionMeta[];
}

export interface FolderSummary {
  id: string;
  name: string;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  thumbnailDataUrl: string | null;
  createdAt: string;
  lastOpenedAt: string | null;
  lastPageNumber: number | null;
  pageCount: number;
  completedAt: string | null;
  lastReviewScore: number | null;
}

export interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

export interface DirectoryListing {
  breadcrumb: BreadcrumbEntry[];
  folders: FolderSummary[];
  documents: DocumentSummary[];
}
