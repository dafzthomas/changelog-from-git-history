import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCommits } from "../../src/git/commits.js";
import { resolveCommitRange } from "../../src/git/range.js";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test Author",
      GIT_AUTHOR_EMAIL: "author@example.com",
      GIT_COMMITTER_NAME: "Test Committer",
      GIT_COMMITTER_EMAIL: "committer@example.com"
    }
  }).trim();
}

function createRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), "cfg-history-"));
  git(cwd, ["init", "--quiet"]);
  git(cwd, ["config", "user.name", "Test Author"]);
  git(cwd, ["config", "user.email", "author@example.com"]);
  return cwd;
}

function commitFile(cwd: string, filename: string, content: string, message: string): string {
  writeFileSync(join(cwd, filename), content);
  git(cwd, ["add", filename]);
  git(cwd, ["commit", "--quiet", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

describe("readCommits", () => {
  it("parses commits from an explicit git revision range", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "chore: initial import");
    git(cwd, ["tag", "v1.0.0"]);
    const hash = commitFile(cwd, "file.txt", "two", "feat(cli): add stdout mode");

    const commits = await readCommits(cwd, "v1.0.0..HEAD");

    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      hash,
      shortHash: hash.slice(0, 7),
      subject: "feat(cli): add stdout mode",
      authorName: "Test Author",
      authorEmail: "author@example.com"
    });
  });
});

describe("resolveCommitRange", () => {
  it("uses the latest semver-like tag by default", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "chore: initial import");
    git(cwd, ["tag", "v1.0.0"]);
    commitFile(cwd, "file.txt", "two", "fix: repair cache");

    const range = await resolveCommitRange(cwd, {});

    expect(range.logRange).toBe("v1.0.0..HEAD");
    expect(range.displayRange).toEqual({ from: "v1.0.0", to: "HEAD" });
    expect(range.previousTag).toBe("v1.0.0");
    expect(range.warnings).toEqual([]);
  });

  it("supports explicit --since and --range values", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "chore: initial import");
    git(cwd, ["tag", "v1.0.0"]);

    await expect(resolveCommitRange(cwd, { since: "v1.0.0" })).resolves.toMatchObject({
      logRange: "v1.0.0..HEAD",
      displayRange: { from: "v1.0.0", to: "HEAD" }
    });

    await expect(resolveCommitRange(cwd, { range: "v1.0.0..HEAD" })).resolves.toMatchObject({
      logRange: "v1.0.0..HEAD",
      displayRange: { from: "v1.0.0", to: "HEAD" }
    });
  });

  it("falls back to full history with a warning when no semver-like tag exists", async () => {
    const cwd = createRepo();
    const rootHash = commitFile(cwd, "file.txt", "one", "feat: first feature");

    const range = await resolveCommitRange(cwd, {});
    const commits = await readCommits(cwd, range.logRange);

    expect(range.logRange).toBe("HEAD");
    expect(range.displayRange).toEqual({
      from: rootHash,
      to: "HEAD",
      marker: `root:${rootHash}..HEAD`
    });
    expect(range.warnings).toEqual(["No semver-like tag found; using full history."]);
    expect(commits.map((commit) => commit.hash)).toEqual([rootHash]);
  });
});
