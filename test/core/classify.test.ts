import { describe, expect, it } from "vitest";
import type { GitCommit } from "../../src/core/commit.js";
import { classifyCommit } from "../../src/core/classify.js";

const baseCommit: GitCommit = {
  hash: "abcdef1234567890",
  shortHash: "abcdef1",
  subject: "",
  body: "",
  authorName: "Alice",
  authorEmail: "alice@example.com"
};

function commit(overrides: Partial<GitCommit>): GitCommit {
  return { ...baseCommit, ...overrides };
}

describe("classifyCommit", () => {
  it("classifies conventional feature commits with scope", () => {
    const result = classifyCommit(commit({ subject: "feat(parser): add JSONL import support" }));

    expect(result.category).toBe("features");
    expect(result.summary).toBe("Add JSONL import support");
    expect(result.type).toBe("feat");
    expect(result.scope).toBe("parser");
    expect(result.confidence).toBe("high");
    expect(result.breaking).toBe(false);
  });

  it("detects conventional breaking changes from bang syntax and footer", () => {
    const result = classifyCommit(
      commit({
        subject: "fix!: change auth token format",
        body: "BREAKING CHANGE: tokens must now be prefixed with Bearer."
      })
    );

    expect(result.category).toBe("fixes");
    expect(result.summary).toBe("Change auth token format");
    expect(result.breaking).toBe(true);
    expect(result.breakingDescription).toBe("tokens must now be prefixed with Bearer.");
    expect(result.confidence).toBe("high");
  });

  it("classifies messy feature and fix messages using heuristics", () => {
    expect(classifyCommit(commit({ subject: "Add CSV export for reports" })).category).toBe("features");
    expect(classifyCommit(commit({ subject: "resolve stale cache detection" })).category).toBe("fixes");
  });

  it("classifies documentation, tests, and dependency updates from common wording", () => {
    expect(classifyCommit(commit({ subject: "Update README usage examples" })).category).toBe("documentation");
    expect(classifyCommit(commit({ subject: "add parser specs for edge cases" })).category).toBe("tests");
    expect(classifyCommit(commit({ subject: "Bump package dependencies" })).category).toBe("dependencies");
  });

  it("keeps unknown commits under other with low confidence", () => {
    const result = classifyCommit(commit({ subject: "misc cleanup" }));

    expect(result.category).toBe("other");
    expect(result.confidence).toBe("low");
    expect(result.summary).toBe("Misc cleanup");
  });

  it("detects high-confidence breaking wording in messy commits", () => {
    const result = classifyCommit(commit({ subject: "breaking: remove legacy config keys" }));

    expect(result.breaking).toBe(true);
    expect(result.breakingDescription).toBe("Breaking change.");
    expect(result.summary).toBe("Remove legacy config keys");
  });

  it("detects BREAKING CHANGE footers on messy commits", () => {
    const result = classifyCommit(
      commit({
        subject: "remove old config loader",
        body: "BREAKING CHANGE: config files must now be JSON."
      })
    );

    expect(result.breaking).toBe(true);
    expect(result.breakingDescription).toBe("config files must now be JSON.");
  });
});
