import { describe, expect, it } from "vitest";
import { findPullRequestNumber } from "../../src/github/enrich.js";

describe("findPullRequestNumber", () => {
  it("detects squash and merge pull request references", () => {
    expect(findPullRequestNumber("Add release notes (#123)")).toBe("123");
    expect(findPullRequestNumber("Merge pull request #456 from acme/feature")).toBe("456");
  });

  it("returns null when a summary does not mention a pull request", () => {
    expect(findPullRequestNumber("Add release notes")).toBeNull();
  });
});
