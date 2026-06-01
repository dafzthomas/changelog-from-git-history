import type { ChangeCategory } from "./categories.js";

export type GitCommit = {
  hash: string;
  shortHash?: string;
  subject: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authorDate?: string;
};

export type CommitConfidence = "low" | "medium" | "high";

export type ClassifiedCommit = {
  category: ChangeCategory;
  summary: string;
  confidence: CommitConfidence;
  breaking: boolean;
  breakingDescription?: string;
  type?: string | null;
  scope?: string | null;
  original: GitCommit;
};
