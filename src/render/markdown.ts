import { CATEGORY_LABELS, CATEGORY_ORDER } from "../core/categories.js";
import type { ChangelogData, ChangelogEntry } from "../core/aggregate.js";

function formatSummary(summary: string): string {
  const trimmedSummary = summary.trim().replace(/[.!?]+$/, "");
  return `${trimmedSummary}.`;
}

function renderEntry(entry: ChangelogEntry): string[] {
  const summary = formatSummary(entry.summary);
  const hashLabel = entry.shortHash ?? entry.hash?.slice(0, 7);
  const linkOrHash =
    entry.commitUrl && hashLabel
      ? `([${hashLabel}](${entry.commitUrl}))`
      : hashLabel
        ? `(${hashLabel})`
        : null;

  const authorPart = entry.author ? ` - ${entry.author}` : "";

  const lines = [`- ${summary}${linkOrHash ? ` ${linkOrHash}` : ""}${authorPart}`];

  if (entry.breakingDescription?.trim()) {
    lines.push(`  - ${entry.breakingDescription.trim()}`);
  }

  return lines;
}

export function renderMarkdown(data: ChangelogData): string {
  const date = data.date ?? "";
  const titleVersion = data.version ?? "Unreleased";
  const lines: string[] = [];

  lines.push(`## ${titleVersion} - ${date}`);

  if (data.range) {
    const marker = data.range.marker ?? `${data.range.from}..${data.range.to}`;
    lines.push("", `<!-- changelog-from-git-history: ${marker} -->`);
  }

  if (data.warnings.length > 0) {
    lines.push("", ...data.warnings.map((warning) => `> ${warning}`));
  }

  const breakingEntries = data.entries.filter((entry) => entry.breaking);
  if (breakingEntries.length > 0) {
    lines.push("", "### Breaking Changes", "");
    lines.push(...breakingEntries.flatMap(renderEntry));
  }

  for (const category of CATEGORY_ORDER) {
    const categoryEntries = data.entries.filter((entry) => !entry.breaking && entry.category === category);
    if (categoryEntries.length === 0) {
      continue;
    }

    lines.push("", `### ${CATEGORY_LABELS[category]}`, "");
    lines.push(...categoryEntries.flatMap(renderEntry));
  }

  if (data.entries.length === 0) {
    lines.push("", "No changes found.");
  }

  const sortedContributors = [...new Set(data.contributors)].sort((a, b) => a.localeCompare(b));
  if (sortedContributors.length > 0) {
    lines.push("", "### Contributors", "");
    lines.push(...sortedContributors.map((contributor) => `- ${contributor}`));
  }

  return `${lines.join("\n")}\n`;
}
