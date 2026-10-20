import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER } from "../../src/core/categories.js";
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
  git(cwd, ["config", "commit.gpgsign", "false"]);
  git(cwd, ["remote", "add", "origin", "https://github.com/acme/widgets.git"]);
  return cwd;
}

function commitFile(cwd: string, filename: string, content: string, message: string): string {
  writeFileSync(join(cwd, filename), content);
  git(cwd, ["add", filename]);
  git(cwd, ["commit", "--quiet", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

function commitAs(cwd: string, filename: string, content: string, message: string, author: string): void {
  writeFileSync(join(cwd, filename), content);
  git(cwd, ["add", filename]);
  execFileSync("git", ["commit", "--quiet", "-m", message], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: author,
      GIT_AUTHOR_EMAIL: `${author.toLowerCase()}@example.com`,
      GIT_COMMITTER_NAME: author,
      GIT_COMMITTER_EMAIL: `${author.toLowerCase()}@example.com`
    }
  });
}

function createCategorizedRepo(): string {
  const cwd = createRepo();
  commitFile(cwd, "file.txt", "base", "chore: initial import");
  git(cwd, ["tag", "v1.0.0"]);
  commitAs(cwd, "file.txt", "feature", "feat: add stdout mode", "Amy");
  commitAs(cwd, "file.txt", "fix", "fix!: change token parsing", "Zara");
  commitAs(cwd, "file.txt", "docs", "docs: update readme", "Zara");
  return cwd;
}

function stableMarkdown(content: string): string {
  return content.replace(/\s\((?:\[[0-9a-f]+\]\([^)]+\)|[0-9a-f]+)\)/g, " (HASH)");
}

const unfilteredMarkdown = `## Unreleased - 2026-06-01

<!-- changelog-from-git-history: v1.0.0..HEAD -->

### Breaking Changes

- Change token parsing. (HASH) - Zara
  - Breaking change.

### Features

- Add stdout mode. (HASH) - Amy

### Documentation

- Update readme. (HASH) - Zara

### Contributors

- Amy
- Zara
`;

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

    expect(result.data.version).toBeUndefined();
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

  it("labels the markdown heading with an explicit release version", async () => {
    const cwd = createRepo();
    commitFile(cwd, "file.txt", "one", "feat: ship export");

    const result = await generateChangelog({
      cwd,
      date: "2026-06-01",
      version: "1.2.3",
      format: "markdown"
    });

    expect(result.content.startsWith("## 1.2.3 - 2026-06-01\n")).toBe(true);
    expect(result.content).not.toContain("Unreleased");
    expect(result.data.version).toBe("1.2.3");
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

  it("keeps every category when categories is omitted", async () => {
    const cwd = createCategorizedRepo();

    const markdown = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "markdown"
    });
    const json = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json"
    });
    const parsed = JSON.parse(json.content);

    expect(markdown.data.warnings).toEqual([]);
    expect(stableMarkdown(markdown.content)).toBe(unfilteredMarkdown);
    expect(parsed).not.toHaveProperty("categories");
    expect(parsed.contributors).toEqual(["Amy", "Zara"]);
    expect(parsed.entries.map((entry: { category: string }) => entry.category)).toEqual([
      "features",
      "fixes",
      "documentation"
    ]);
    expect(parsed.entries.map((entry: { summary: string }) => entry.summary)).toEqual([
      "Add stdout mode",
      "Change token parsing",
      "Update readme"
    ]);
  });

  it("prints a breaking fix before Features when both categories are kept", async () => {
    const cwd = createCategorizedRepo();
    const categories = new Set(["fixes", "features"]);

    const markdown = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "markdown",
      categories
    });
    const json = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json",
      categories
    });
    const parsed = JSON.parse(json.content);
    const content = stableMarkdown(markdown.content);

    expect(content.indexOf("### Breaking Changes")).toBeLessThan(content.indexOf("### Features"));
    expect(content).toContain("Change token parsing. (HASH) - Zara");
    expect(content).toContain("Add stdout mode. (HASH) - Amy");
    expect(content).not.toContain("### Documentation");
    expect(content).not.toContain("### Fixes");
    expect(parsed.entries.map((entry: { category: string }) => entry.category)).toEqual([
      "features",
      "fixes"
    ]);
  });

  it("omits a breaking change when its category is dropped", async () => {
    const cwd = createCategorizedRepo();
    const categories = new Set(CATEGORY_ORDER.filter((category) => category !== "fixes"));

    const markdown = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "markdown",
      categories
    });
    const json = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json",
      categories
    });
    const parsed = JSON.parse(json.content);

    expect(markdown.content).not.toContain("Breaking Changes");
    expect(markdown.content).not.toContain("token parsing");
    expect(markdown.content).toContain("### Features");
    expect(markdown.content).toContain("### Documentation");
    expect(parsed.contributors).toEqual(["Amy", "Zara"]);
    expect(parsed.entries.map((entry: { summary: string }) => entry.summary)).toEqual([
      "Add stdout mode",
      "Update readme"
    ]);
  });

  it("renders no entries when the category set is empty", async () => {
    const cwd = createCategorizedRepo();

    const markdown = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "markdown",
      categories: new Set()
    });
    const json = await generateChangelog({
      cwd,
      date: "2026-06-01",
      format: "json",
      categories: new Set()
    });
    const parsed = JSON.parse(json.content);

    expect(stableMarkdown(markdown.content)).toBe(`## Unreleased - 2026-06-01

<!-- changelog-from-git-history: v1.0.0..HEAD -->

No changes found.
`);
    expect(markdown.content).not.toContain("### ");
    expect(markdown.content).not.toContain("Contributors");
    expect(parsed.entries).toEqual([]);
    expect(parsed.contributors).toEqual([]);
  });
});
