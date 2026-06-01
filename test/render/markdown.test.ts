import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/render/markdown.js";
import type { ChangelogData } from "../../src/core/aggregate.js";

describe("renderMarkdown", () => {
  it("renders a GitHub-ready changelog with breaking changes first", () => {
    const data: ChangelogData = {
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
          breaking: false
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
      warnings: []
    };

    expect(renderMarkdown(data)).toMatchInlineSnapshot(`
      "## 1.2.3 - 2026-06-01

      <!-- changelog-from-git-history: v1.2.2..HEAD -->

      ### Breaking Changes

      - Changed the auth token format. ([abc1234](https://github.com/acme/tool/commit/abc123456)) - Alice
        - API clients must send Bearer tokens.

      ### Features

      - Added import support for JSONL usage logs. ([def5678](https://github.com/acme/tool/commit/def567890)) - Bob

      ### Contributors

      - Alice
      - Bob
      "
    `);
  });

  it("renders Unreleased when no version is provided and omits empty sections", () => {
    const data: ChangelogData = {
      date: "2026-06-01",
      entries: [],
      contributors: [],
      warnings: ["No semver-like tag found; using full history."]
    };

    expect(renderMarkdown(data)).toContain("## Unreleased - 2026-06-01");
    expect(renderMarkdown(data)).toContain("No changes found.");
    expect(renderMarkdown(data)).not.toContain("### Contributors");
  });
});
