import type { ChangeCategory } from "./categories.js";
import type { ClassifiedCommit, CommitConfidence, GitCommit } from "./commit.js";

type ConventionalMatch = {
  type: string;
  scope?: string;
  breaking: boolean;
  summary: string;
};

const CONVENTIONAL_COMMIT = /^(?<type>[a-z]+)(?:\((?<scope>[^)\n]+)\))?(?<breaking>!)?:\s*(?<summary>.+)$/i;
const BREAKING_FOOTER = /^\s*BREAKING CHANGE:\s*(?<description>.+)$/im;
const BREAKING_SUBJECT = /^\s*breaking(?:\s+change)?[:\s-]+(?<summary>.+)$/i;

const TYPE_CATEGORY_MAP: Record<string, ChangeCategory> = {
  feat: "features",
  fix: "fixes",
  docs: "documentation",
  perf: "performance",
  refactor: "refactors",
  test: "tests",
  build: "build",
  ci: "build",
  chore: "maintenance",
};

const FEATURE_KEYWORDS = [
  /\badd\b/i,
  /\bcreate\b/i,
  /\bimplement\b/i,
];

const FIX_KEYWORDS = [
  /\bfix\b/i,
  /\brepair\b/i,
  /\bresolve\b/i,
];

const DOC_KEYWORDS = [
  /\bdocs?\b/i,
  /\breadme\b/i,
  /\bdocumentation\b/i,
  /\bupdate\s+readme/i,
];

const TEST_KEYWORDS = [
  /\btest(s)?\b/i,
  /\bspec(s)?\b/i,
];

const DEPS_KEYWORDS = [
  /\bdeps?\b/i,
  /\bdependency\b/i,
  /\bdependencies\b/i,
  /\bpackage\b/i,
  /\bbump\b/i,
];

function normalizeSummary(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function parseConventionalCommit(subject: string): ConventionalMatch | null {
  const match = CONVENTIONAL_COMMIT.exec(subject.trim());
  if (!match?.groups) {
    return null;
  }

  const type = match.groups.type.toLowerCase();
  const scope = match.groups.scope?.trim();

  return {
    type,
    scope: scope ? scope : undefined,
    breaking: match.groups.breaking === "!",
    summary: match.groups.summary.trim(),
  };
}

function parseBreakingDescription(body: string): string | null {
  if (!body) {
    return null;
  }

  const match = BREAKING_FOOTER.exec(body);
  if (!match?.groups) {
    return null;
  }

  return match.groups.description.trim();
}

function parseBreakingSubject(subject: string): string | null {
  return BREAKING_SUBJECT.exec(subject)?.groups?.summary.trim() ?? null;
}

function classifyHeuristically(subject: string): { category: ChangeCategory; confidence: CommitConfidence } {
  const normalized = subject.toLowerCase();

  if (TEST_KEYWORDS.some((pattern) => pattern.test(normalized))) {
    return { category: "tests", confidence: "medium" };
  }

  if (DOC_KEYWORDS.some((pattern) => pattern.test(normalized))) {
    return { category: "documentation", confidence: "medium" };
  }

  if (DEPS_KEYWORDS.some((pattern) => pattern.test(normalized))) {
    return { category: "dependencies", confidence: "medium" };
  }

  if (FIX_KEYWORDS.some((pattern) => pattern.test(normalized))) {
    return { category: "fixes", confidence: "medium" };
  }

  if (FEATURE_KEYWORDS.some((pattern) => pattern.test(normalized))) {
    return { category: "features", confidence: "medium" };
  }

  return { category: "other", confidence: "low" };
}

export function classifyCommit(commit: GitCommit): ClassifiedCommit {
  const subject = commit.subject ?? "";
  const body = commit.body ?? "";
  const conventional = parseConventionalCommit(subject);

  if (conventional) {
    const mappedCategory = TYPE_CATEGORY_MAP[conventional.type] ?? null;
    const footerBreaking = parseBreakingDescription(body);
    const subjectBreakingSummary = parseBreakingSubject(subject);
    const isBreaking =
      conventional.breaking ||
      conventional.type === "breaking" ||
      subjectBreakingSummary !== null ||
      /\bBREAKING CHANGE\b/i.test(body);

    const breakingDescription = isBreaking
      ? footerBreaking ?? "Breaking change."
      : undefined;
    const confidence: CommitConfidence = mappedCategory === null ? "low" : "high";

    const category =
      mappedCategory ??
      (() => {
        if (conventional.summary.toLowerCase().includes("doc")) {
          return "documentation";
        }
        if (conventional.summary.toLowerCase().includes("test")) {
          return "tests";
        }
        if (conventional.summary.toLowerCase().includes("dep")) {
          return "dependencies";
        }
        return "other";
      })();

    const summarySource = subjectBreakingSummary ?? conventional.summary;
    const summary = summarySource.length > 0 ? normalizeSummary(summarySource) : "No summary provided";

    return {
      category,
      summary,
      confidence,
      breaking: isBreaking,
      ...(breakingDescription ? { breakingDescription } : {}),
      type: conventional.type,
      scope: conventional.scope ?? null,
      original: commit,
    };
  }

  const heuristic = classifyHeuristically(subject);
  const footerBreaking = parseBreakingDescription(body);
  const subjectBreakingSummary = parseBreakingSubject(subject);
  const isBreaking = footerBreaking !== null || subjectBreakingSummary !== null;
  const summary = normalizeSummary(subjectBreakingSummary ?? subject);
  const category = heuristic.category;

  return {
    category,
    summary,
    confidence: heuristic.confidence,
    breaking: isBreaking,
    ...(isBreaking ? { breakingDescription: footerBreaking ?? "Breaking change." } : {}),
    type: null,
    scope: null,
    original: commit,
  };
}
