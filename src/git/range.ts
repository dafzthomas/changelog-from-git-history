import { runGit } from "./git.js";
import { pickLatestSemverTag } from "./tags.js";

export type ResolvedCommitRange = {
  logRange: string;
  displayRange: {
    from: string;
    to: string;
    marker?: string;
  };
  previousTag?: string;
  warnings: string[];
};

export type ResolveCommitRangeOptions = {
  since?: string;
  range?: string;
};

export async function resolveCommitRange(
  cwd: string,
  options: ResolveCommitRangeOptions
): Promise<ResolvedCommitRange> {
  if (options.since && options.range) {
    throw new Error("Use either --since or --range, not both.");
  }

  if (options.range) {
    const displayRange = parseRevisionRange(options.range);
    return {
      logRange: options.range,
      displayRange,
      warnings: []
    };
  }

  if (options.since) {
    return {
      logRange: `${options.since}..HEAD`,
      displayRange: { from: options.since, to: "HEAD" },
      warnings: []
    };
  }

  const tagNames = (await runGit(["tag", "--list", "--sort=-creatordate"], cwd))
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const previousTag = pickLatestSemverTag(tagNames);

  if (previousTag) {
    return {
      logRange: `${previousTag}..HEAD`,
      displayRange: { from: previousTag, to: "HEAD" },
      previousTag,
      warnings: []
    };
  }

  const rootCommit = (await runGit(["rev-list", "--max-parents=0", "HEAD"], cwd))
    .split("\n")
    .map((hash) => hash.trim())
    .filter(Boolean)[0];

  return {
    logRange: "HEAD",
    displayRange: { from: rootCommit, to: "HEAD", marker: `root:${rootCommit}..HEAD` },
    warnings: ["No semver-like tag found; using full history."]
  };
}

function parseRevisionRange(range: string): { from: string; to: string } {
  const [from, to] = range.split("..");
  if (!from || !to || range.includes("...")) {
    throw new Error(`Expected --range to use the form <from>..<to>, received ${range}`);
  }
  return { from, to };
}
