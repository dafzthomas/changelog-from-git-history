import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ChangelogData } from "../../src/core/aggregate.js";
import { renderReleaseNotes } from "../../src/render/release-notes.js";

const sample: ChangelogData = {
  version: "1.2.3",
  date: "2026-06-01",
  range: { from: "v1.2.2", to: "HEAD" },
  entries: [
    {
      category: "features",
      summary: "Added import support for JSONL usage logs",
      hash: "def567890",
      shortHash: "def5678",
      commitUrl: "https://github.com/acme/tool/commit/def567890",
      author: "Bob",
      breaking: false,
      prNumber: "14",
      prUrl: "https://github.com/acme/tool/pull/14",
      prAuthor: "bob"
    },
    {
      category: "fixes",
      summary: "Changed the auth token format",
      hash: "abc123456",
      shortHash: "abc1234",
      commitUrl: "https://github.com/acme/tool/commit/abc123456",
      author: "Alice",
      breaking: true,
      breakingDescription: "API clients must send Bearer tokens."
    }
  ],
  contributors: ["Bob", "Alice"],
  warnings: ["No semver-like tag found; using full history."]
};

describe("renderReleaseNotes", () => {
  it("renders a compact GitHub release body", () => {
    const example = readFileSync(new URL("../../examples/release-notes.md", import.meta.url), "utf8");
    const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
    const notes = renderReleaseNotes(sample);

    expect(notes).toBe(example);
    expect(readme).toContain(example.trimEnd());
    expect(notes).toContain(
      "* Added import support for JSONL usage logs by @bob in [#14](https://github.com/acme/tool/pull/14)"
    );
    expect(notes).not.toContain(". by ");
    expect(notes).not.toContain("1.2.3");
    expect(notes).not.toContain("2026-06-01");
    expect(notes).not.toContain("No semver-like tag found");
    expect(notes).not.toContain("<!-- changelog-from-git-history:");
    expect(notes).toContain(
      "**Full Changelog**: [v1.2.2...abc123456](https://github.com/acme/tool/compare/v1.2.2...abc123456)"
    );
    expect(notes).not.toContain("HEAD");
  });

  it("keeps an explicit range end in the compare link", () => {
    const notes = renderReleaseNotes({
      range: { from: "v1.0.0", to: "v1.1.0" },
      entries: [
        {
          category: "features",
          summary: "Add export",
          hash: "def567890abcdef",
          shortHash: "def5678",
          commitUrl: "https://github.com/acme/tool/commit/def567890abcdef",
          author: "Casey"
        }
      ],
      contributors: ["Casey"],
      warnings: []
    });

    expect(notes).toContain(
      "**Full Changelog**: [v1.0.0...v1.1.0](https://github.com/acme/tool/compare/v1.0.0...v1.1.0)"
    );
    expect(notes).not.toContain("compare/v1.0.0...def567890abcdef");
  });

  it("omits empty sections and a generic breaking fallback", () => {
    const empty: ChangelogData = {
      entries: [],
      contributors: [],
      warnings: []
    };

    expect(renderReleaseNotes(empty)).toBe("## What's Changed\n\nNo changes found.\n");

    const generic: ChangelogData = {
      range: { from: "v1.0.0", to: "v1.1.0" },
      entries: [
        {
          category: "fixes",
          summary: "Change the config format",
          shortHash: "abc1234",
          commitUrl: "https://gitlab.com/acme/tool/commit/abc123456",
          author: "Casey",
          breaking: true,
          breakingDescription: "Breaking change."
        }
      ],
      contributors: ["Casey"],
      warnings: []
    };

    expect(renderReleaseNotes(generic)).toBe(`## What's Changed

### Breaking Changes

* Change the config format by Casey in [abc1234](https://gitlab.com/acme/tool/commit/abc123456)

## Contributors

* Casey

**Full Changelog**: v1.0.0...v1.1.0
`);
  });
});
