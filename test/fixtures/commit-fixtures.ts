import type { GitCommit } from "../../src/core/commit.js";

export function commitFixture(overrides: Partial<GitCommit> = {}): GitCommit {
  return {
    hash: "abcdef1234567890",
    shortHash: "abcdef1",
    subject: "feat: add example",
    body: "",
    authorName: "Fixture Author",
    authorEmail: "fixture@example.com",
    authorDate: "2026-06-01",
    ...overrides
  };
}
