import type { ChangeCategory } from "./categories.js";

export type ChangelogEntry = {
  category: ChangeCategory;
  summary: string;
  hash?: string;
  shortHash?: string;
  commitUrl?: string;
  author?: string;
  breaking?: boolean;
  breakingDescription?: string;
  prNumber?: string;
  prUrl?: string;
  prAuthor?: string;
};

export type ChangelogRange = {
  from: string;
  to: string;
  marker?: string;
};

export type ChangelogData = {
  version?: string;
  date?: string;
  range?: ChangelogRange | null;
  entries: readonly ChangelogEntry[];
  contributors: readonly string[];
  warnings: readonly string[];
};
