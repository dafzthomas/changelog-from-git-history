import type { ChangelogData, ChangelogEntry, ChangelogRange } from "../core/aggregate.js";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../core/categories.js";

const GENERIC_BREAKING_DESCRIPTION = "Breaking change.";

export function renderReleaseNotes(data: ChangelogData): string {
  const lines: string[] = ["## What's Changed"];
  const breakingEntries = data.entries.filter((entry) => entry.breaking);

  if (breakingEntries.length > 0) {
    lines.push("", "### Breaking Changes", "", ...breakingEntries.map(renderEntry));
  }

  for (const category of CATEGORY_ORDER) {
    const categoryEntries = data.entries.filter((entry) => !entry.breaking && entry.category === category);
    if (categoryEntries.length === 0) {
      continue;
    }

    lines.push("", `### ${CATEGORY_LABELS[category]}`, "", ...categoryEntries.map(renderEntry));
  }

  if (data.entries.length === 0) {
    lines.push("", "No changes found.");
  }

  const contributors = [...new Set(data.contributors)].sort((left, right) => left.localeCompare(right));
  if (contributors.length > 0) {
    lines.push("", "## Contributors", "", ...contributors.map((contributor) => `* ${contributor}`));
  }

  if (data.range) {
    lines.push("", `**Full Changelog**: ${formatFullChangelog(data.range, data.entries)}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderEntry(entry: ChangelogEntry): string {
  const breakingDescription = entry.breakingDescription?.trim();
  const detailText =
    breakingDescription && breakingDescription !== GENERIC_BREAKING_DESCRIPTION
      ? phrase(breakingDescription)
      : "";
  const summary = detailText ? `${phrase(entry.summary)}.` : phrase(entry.summary);
  const detail = detailText ? ` ${detailText}` : "";

  return `* ${summary}${detail}${attribution(entry)}`;
}

function phrase(text: string): string {
  return text.trim().replace(/[.!?]+$/, "");
}

function attribution(entry: ChangelogEntry): string {
  const author = releaseAuthor(entry);
  const link = releaseLink(entry);

  if (author && link) {
    return ` by ${author} in ${link}`;
  }
  if (author) {
    return ` by ${author}`;
  }
  if (link) {
    return ` in ${link}`;
  }
  return "";
}

function releaseAuthor(entry: ChangelogEntry): string | null {
  const login = entry.prAuthor?.trim().replace(/^@/, "");
  if (login) {
    return `@${login}`;
  }

  const author = entry.author?.trim();
  return author ? author : null;
}

function releaseLink(entry: ChangelogEntry): string | null {
  if (entry.prUrl && entry.prNumber) {
    return `[#${entry.prNumber}](${entry.prUrl})`;
  }
  if (entry.prUrl) {
    return entry.prUrl;
  }

  const hashLabel = entry.shortHash ?? entry.hash?.slice(0, 7);
  if (entry.commitUrl && hashLabel) {
    return `[${hashLabel}](${entry.commitUrl})`;
  }
  return hashLabel ?? null;
}

function formatFullChangelog(range: ChangelogRange, entries: readonly ChangelogEntry[]): string {
  const to = compareTarget(range, entries);
  const label = `${range.from}...${to}`;
  const compareUrl = githubCompareUrl(range, entries, to);
  return compareUrl ? `[${label}](${compareUrl})` : label;
}

function compareTarget(range: ChangelogRange, entries: readonly ChangelogEntry[]): string {
  if (range.to !== "HEAD") {
    return range.to;
  }

  // Commits arrive oldest-first, so the last hash is the revision HEAD names.
  return entries.at(-1)?.hash ?? range.to;
}

function githubCompareUrl(
  range: ChangelogRange,
  entries: readonly ChangelogEntry[],
  to: string
): string | null {
  for (const entry of entries) {
    const commitUrl = entry.commitUrl;
    if (!commitUrl) {
      continue;
    }

    const match = /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/commit\/[0-9a-f]+$/i.exec(commitUrl);
    if (!match) {
      continue;
    }

    return `${match[1]}/compare/${encodeURIComponent(range.from)}...${encodeURIComponent(to)}`;
  }

  return null;
}
