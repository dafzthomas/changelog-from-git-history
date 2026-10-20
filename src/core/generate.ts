import type { ChangelogData, ChangelogEntry } from "./aggregate.js";
import type { ChangeCategory } from "./categories.js";
import { classifyCommit } from "./classify.js";
import type { OutputFormat } from "./format.js";
import { assertGitRepository } from "../git/git.js";
import { readCommits } from "../git/commits.js";
import { resolveCommitRange } from "../git/range.js";
import { getOriginGitHubRemote } from "../git/remote-info.js";
import { enrichWithGitHub } from "../github/enrich.js";
import { renderJson } from "../render/json.js";
import { renderMarkdown } from "../render/markdown.js";
import { renderReleaseNotes, type ReleaseNotesCompare } from "../render/release-notes.js";

export type GenerateChangelogOptions = {
  cwd: string;
  since?: string;
  range?: string;
  format?: OutputFormat;
  github?: boolean;
  date?: string;
  categories?: ReadonlySet<ChangeCategory>;
  env?: NodeJS.ProcessEnv;
  version?: string;
};

export type GenerateChangelogResult = {
  data: ChangelogData;
  content: string;
};

export async function generateChangelog(
  options: GenerateChangelogOptions
): Promise<GenerateChangelogResult> {
  await assertGitRepository(options.cwd);

  const resolvedRange = await resolveCommitRange(options.cwd, {
    since: options.since,
    range: options.range
  });
  const commits = await readCommits(options.cwd, resolvedRange.logRange);
  const remote = await getOriginGitHubRemote(options.cwd);

  const classifiedEntries: ChangelogEntry[] = commits.map((commit) => {
    const classified = classifyCommit(commit);
    return {
      category: classified.category,
      summary: classified.summary,
      hash: commit.hash,
      shortHash: commit.shortHash ?? commit.hash.slice(0, 7),
      commitUrl: remote?.commitUrl(commit.hash),
      author: commit.authorName,
      breaking: classified.breaking,
      breakingDescription: classified.breakingDescription
    };
  });

  const tip = classifiedEntries.at(-1);
  const compare: ReleaseNotesCompare = {
    to: resolvedRange.displayRange.to === "HEAD" ? (tip?.hash ?? "HEAD") : resolvedRange.displayRange.to,
    ...(tip?.commitUrl ? { commitUrl: tip.commitUrl } : {})
  };

  const categories = options.categories;
  const entries =
    categories === undefined
      ? classifiedEntries
      : classifiedEntries.filter((entry) => categories.has(entry.category));
  const enrichment = await resolveGitHubEnrichment(options, entries, remote !== null);
  const contributors =
    categories === undefined
      ? [...new Set(commits.map((commit) => commit.authorName).filter(Boolean))]
      : firstSeenAuthors(enrichment.entries);

  const data: ChangelogData = {
    ...(options.version ? { version: options.version } : {}),
    date: options.date ?? new Date().toISOString().slice(0, 10),
    range: resolvedRange.displayRange,
    entries: enrichment.entries,
    contributors,
    warnings: [...resolvedRange.warnings, ...enrichment.warnings]
  };

  return {
    data,
    content: renderChangelog(options.format ?? "markdown", data, compare)
  };
}

function renderChangelog(
  format: OutputFormat,
  data: ChangelogData,
  compare: ReleaseNotesCompare
): string {
  switch (format) {
    case "markdown":
      return renderMarkdown(data);
    case "json":
      return renderJson(data);
    case "release-notes":
      return renderReleaseNotes(data, compare);
  }
}

function firstSeenAuthors(entries: readonly ChangelogEntry[]): string[] {
  const authors: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const author = entry.author;
    if (!author || seen.has(author)) {
      continue;
    }
    seen.add(author);
    authors.push(author);
  }

  return authors;
}

async function resolveGitHubEnrichment(
  options: GenerateChangelogOptions,
  entries: ChangelogEntry[],
  hasGitHubRemote: boolean
): Promise<{ entries: ChangelogEntry[]; warnings: string[] }> {
  if (!options.github) {
    return { entries, warnings: [] };
  }

  if (!hasGitHubRemote) {
    return {
      entries,
      warnings: ["GitHub enrichment requested, but origin is not a GitHub remote."]
    };
  }

  return enrichWithGitHub(entries, options.cwd, options.env);
}
