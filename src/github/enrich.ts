import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangelogEntry } from "../core/aggregate.js";

const execFileAsync = promisify(execFile);

type GitHubPr = {
  title?: string;
  url?: string;
  author?: {
    login?: string;
    name?: string;
  };
};

export type GitHubEnrichmentResult = {
  entries: ChangelogEntry[];
  warnings: string[];
};

const PULL_REQUEST_PATTERNS = [
  /\(#(?<number>\d+)\)(?:\s*[.!?])?\s*$/,
  /\bpull request #(?<number>\d+)\b/i
] as const;

export async function enrichWithGitHub(
  entries: ChangelogEntry[],
  cwd: string,
  env?: NodeJS.ProcessEnv
): Promise<GitHubEnrichmentResult> {
  const available = await hasAuthenticatedGitHubCli(cwd, env);
  if (!available) {
    return {
      entries,
      warnings: ["GitHub enrichment requested, but gh is unavailable or not authenticated."]
    };
  }

  const enrichedEntries: ChangelogEntry[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    const prNumber = findPullRequestNumber(entry.summary);
    if (!prNumber) {
      enrichedEntries.push(entry);
      continue;
    }

    try {
      const { stdout } = await execFileAsync(
        "gh",
        ["pr", "view", prNumber, "--json", "title,url,author"],
        { cwd, encoding: "utf8", maxBuffer: 1024 * 1024, env: env ?? process.env }
      );
      const pr = JSON.parse(stdout) as GitHubPr;
      enrichedEntries.push({
        ...entry,
        summary: pr.title?.trim() || entry.summary,
        prUrl: pr.url,
        prNumber,
        prAuthor: pr.author?.login || pr.author?.name
      });
    } catch {
      warnings.push(`Could not fetch GitHub PR metadata for #${prNumber}.`);
      enrichedEntries.push(entry);
    }
  }

  return { entries: enrichedEntries, warnings };
}

async function hasAuthenticatedGitHubCli(cwd: string, env?: NodeJS.ProcessEnv): Promise<boolean> {
  const options = { cwd, encoding: "utf8" as const, env: env ?? process.env };
  try {
    await execFileAsync("gh", ["--version"], options);
    await execFileAsync("gh", ["auth", "status"], options);
    return true;
  } catch {
    return false;
  }
}

export function findPullRequestNumber(summary: string): string | null {
  for (const pattern of PULL_REQUEST_PATTERNS) {
    const number = summary.match(pattern)?.groups?.number;
    if (number) {
      return number;
    }
  }

  return null;
}
