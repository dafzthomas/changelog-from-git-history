import { describe, expect, it } from "vitest";
import type { ChangelogData } from "../../src/core/aggregate.js";
import { runCli } from "../../src/cli/index.js";
import {
  createBreakingFooterHistory,
  createNonGitHubRemoteHistory,
  createSmallOssHistory,
  createSquashMergeHistory,
  createUntaggedHistory
} from "./histories.js";

function capture(cwd: string) {
  let stdout = "";
  let stderr = "";
  return {
    runtime: {
      cwd,
      stdout: {
        write(chunk: string) {
          stdout += chunk;
        }
      },
      stderr: {
        write(chunk: string) {
          stderr += chunk;
        }
      }
    },
    read() {
      return { stdout, stderr };
    }
  };
}

async function run(cwd: string, args: string[]) {
  const io = capture(cwd);
  const code = await runCli(args, io.runtime);
  return { code, ...io.read() };
}

async function runJson(cwd: string, args = ["--format", "json"]) {
  const result = await run(cwd, args);
  return {
    ...result,
    data: JSON.parse(result.stdout) as ChangelogData
  };
}

describe("squash merge history", () => {
  it("lists the squash commit and leaves the branch commits out", async () => {
    const { cwd } = createSquashMergeHistory();
    const { code, data, stderr } = await runJson(cwd);

    expect(code).toBe(0);
    expect(stderr).toBe("");
    expect(data.warnings).toEqual([]);
    expect(data.range).toMatchObject({ from: "v1.0.0", to: "HEAD" });
    expect(data.entries).toEqual([
      expect.objectContaining({
        category: "features",
        summary: "Add export command (#8)",
        author: "Ada Lovelace",
        breaking: false
      })
    ]);
  });
});

describe("repository with no tags", () => {
  it("prints the full history and warns", async () => {
    const { cwd } = createUntaggedHistory();
    const json = await runJson(cwd);
    const markdown = await run(cwd, []);

    expect(json.code).toBe(0);
    expect(json.stderr).toBe("No semver-like tag found; using full history.\n");
    expect(json.data.warnings).toEqual(["No semver-like tag found; using full history."]);
    expect(json.data.range?.to).toBe("HEAD");
    expect(json.data.range?.marker).toBe(`root:${json.data.range?.from}..HEAD`);
    expect(json.data.entries.map((entry) => entry.summary)).toEqual([
      "Add parser",
      "Repair empty input",
      "Update the readme"
    ]);
    expect(markdown.stdout).toContain("> No semver-like tag found; using full history.");
    expect(markdown.stdout).toContain(`<!-- changelog-from-git-history: root:${json.data.range?.from}..HEAD -->`);
  });
});

describe("non-GitHub remote", () => {
  it("prints a short hash and no commit link", async () => {
    const { cwd } = createNonGitHubRemoteHistory();
    const { code, stdout, stderr } = await run(cwd, []);

    expect(code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("### Features");
    expect(stdout).toContain("Add parser.");
    expect(stdout).toMatch(/\([0-9a-f]{7}\)/);
    expect(stdout).not.toContain("http");
    expect(stdout).not.toContain("gitlab.com");
  });

  it("warns when GitHub enrichment is requested", async () => {
    const { cwd } = createNonGitHubRemoteHistory();
    const { code, data, stderr } = await runJson(cwd, ["--format", "json", "--github"]);

    expect(code).toBe(0);
    expect(stderr).toContain("GitHub enrichment requested, but origin is not a GitHub remote.");
    expect(data.warnings).toEqual([
      "GitHub enrichment requested, but origin is not a GitHub remote."
    ]);
    expect(data.entries[0]).not.toHaveProperty("commitUrl");
    expect(data.entries[0]).toMatchObject({
      category: "features",
      summary: "Add parser"
    });
  });
});

describe("breaking change footers", () => {
  it("keeps footer text on both conventional and untyped commits", async () => {
    const { cwd } = createBreakingFooterHistory();
    const json = await runJson(cwd);
    const markdown = await run(cwd, []);

    expect(json.code).toBe(0);
    expect(json.stderr).toBe("");
    expect(json.data.entries).toEqual([
      expect.objectContaining({
        category: "fixes",
        summary: "Change token parsing",
        breaking: true,
        breakingDescription: "tokens must now be prefixed with Bearer."
      }),
      expect.objectContaining({
        category: "other",
        summary: "Remove old config loader",
        breaking: true,
        breakingDescription: "config files must now be JSON."
      })
    ]);
    expect(markdown.stdout).toContain("### Breaking Changes");
    expect(markdown.stdout).toContain("Change token parsing.");
    expect(markdown.stdout).toContain("  - tokens must now be prefixed with Bearer.");
    expect(markdown.stdout).toContain("Remove old config loader.");
    expect(markdown.stdout).toContain("  - config files must now be JSON.");
    expect(markdown.stdout).not.toContain("### Fixes");
    expect(markdown.stdout).not.toContain("### Other");
  });
});

describe("small project history", () => {
  it("renders the commits since the latest tag", async () => {
    const { cwd } = createSmallOssHistory();
    const json = await runJson(cwd);
    const markdown = await run(cwd, []);

    expect(json.code).toBe(0);
    expect(json.stderr).toBe("");
    expect(json.data.range).toMatchObject({ from: "v0.1.0", to: "HEAD" });
    expect(json.data.contributors).toEqual(["Grace Hopper", "Ada Lovelace"]);
    expect(json.data.entries.map((entry) => entry.summary)).toEqual([
      "Add note search (#3)",
      "Explain the search flag",
      "Bump package dependencies",
      "Drop the title prefix"
    ]);
    expect(json.data.entries[0]).toMatchObject({
      category: "features",
      author: "Grace Hopper",
      breaking: false
    });
    expect(json.data.entries[3]).toMatchObject({
      category: "features",
      author: "Ada Lovelace",
      breaking: true,
      breakingDescription: "titles no longer include a hash prefix."
    });
    expect(json.stdout).not.toContain("Parse a note title");
    expect(json.stdout).not.toContain("Index note bodies");
    expect(json.stdout).not.toContain("Skip empty notes");

    expect(markdown.stdout).toContain("<!-- changelog-from-git-history: v0.1.0..HEAD -->");
    expect(markdown.stdout).toContain("### Breaking Changes");
    expect(markdown.stdout).toContain("Drop the title prefix.");
    expect(markdown.stdout).toContain("  - titles no longer include a hash prefix.");
    expect(markdown.stdout).toContain("### Features");
    expect(markdown.stdout).toContain("Add note search (#3).");
    expect(markdown.stdout).toContain("### Documentation");
    expect(markdown.stdout).toContain("Explain the search flag.");
    expect(markdown.stdout).toContain("### Dependencies");
    expect(markdown.stdout).toContain("Bump package dependencies.");
    expect(markdown.stdout).toContain("### Contributors\n\n- Ada Lovelace\n- Grace Hopper\n");
    expect(markdown.stdout.match(/https:\/\/github\.com\/example\/tiny-notes\/commit\/[0-9a-f]{40}/g)).toHaveLength(4);
    expect(markdown.stdout).not.toContain("Parse a note title");
    expect(markdown.stdout).not.toContain("Skip empty notes");
  });
});
