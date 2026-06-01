import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateChangelog } from "../../src/core/generate.js";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Casey",
      GIT_AUTHOR_EMAIL: "casey@example.com",
      GIT_COMMITTER_NAME: "Casey",
      GIT_COMMITTER_EMAIL: "casey@example.com"
    }
  }).trim();
}

function createRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), "cfg-generate-"));
  git(cwd, ["init", "--quiet"]);
  git(cwd, ["config", "user.name", "Casey"]);
  git(cwd, ["config", "user.email", "casey@example.com"]);
  git(cwd, ["remote", "add", "origin", "https://github.com/acme/widgets.git"]);
  return cwd;
}

function commitFile(cwd: string, filename: string, content: string, message: string): string {
  writeFileSync(join(cwd, filename), content);
  git(cwd, ["add", filename]);
  git(cwd, ["commit", "--quiet", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

describe("generateChangelog", () => {
  it("builds markdown from local git history and GitHub commit links", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "chore: initial import");
    git(cwd, ["tag", "v1.0.0"]);
    const featureHash = commitFile(cwd, "file.txt", "two", "feat(cli): add stdout mode");
    commitFile(cwd, "file.txt", "three", "fix!: change token parsing");

    const result = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "markdown"
    });

    expect(result.content).toContain("## Unreleased - 2026-06-01");
    expect(result.content).toContain("<!-- changelog-from-git-history: v1.0.0..HEAD -->");
    expect(result.content).toContain("### Breaking Changes");
    expect(result.content).toContain("### Features");
    expect(result.content).toContain(
      `([${featureHash.slice(0, 7)}](https://github.com/acme/widgets/commit/${featureHash}))`
    );
    expect(result.content).toContain("### Contributors\n\n- Casey");
    expect(result.data.entries).toHaveLength(2);
  });

  it("can render JSON output", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "feat: first feature");

    const result = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json"
    });

    expect(JSON.parse(result.content)).toMatchObject({
      date: "2026-06-01",
      entries: [{ category: "features", summary: "First feature" }],
      warnings: ["No semver-like tag found; using full history."]
    });
  });

  it("warns instead of running GitHub enrichment without a GitHub remote", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "cfg-no-github-"));
    git(cwd, ["init", "--quiet"]);
    git(cwd, ["config", "user.name", "Casey"]);
    git(cwd, ["config", "user.email", "casey@example.com"]);
    commitFile(cwd, "file.txt", "one", "feat: first feature (#123)");

    const result = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json",
      github: true
    });

    expect(result.data.warnings).toContain(
      "GitHub enrichment requested, but origin is not a GitHub remote."
    );
  });
});
