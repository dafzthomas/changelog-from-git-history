import { describe, expect, it } from "vitest";
import { findPullRequestNumber } from "../../src/github/enrich.js";

describe("findPullRequestNumber", () => {
  it("detects squash suffixes, including a trailing period", () => {
    expect(findPullRequestNumber("Add release notes (#123)")).toBe("123");
    expect(findPullRequestNumber("Correct parser (#777).")).toBe("777");
    expect(findPullRequestNumber("Ship the fix (#8)!")).toBe("8");
  });

  it("detects merge pull request subjects", () => {
    expect(findPullRequestNumber("Merge pull request #456 from acme/feature")).toBe("456");
    expect(findPullRequestNumber("Merge pull request #456")).toBe("456");
    expect(findPullRequestNumber("merge PULL REQUEST #7 from Acme/Feature")).toBe("7");
  });

  it("prefers a squash suffix over an earlier merge phrase", () => {
    expect(findPullRequestNumber("Merge pull request #1 from acme (#2)")).toBe("2");
  });

  it("returns null when a summary does not mention a pull request", () => {
    expect(findPullRequestNumber("Add release notes")).toBeNull();
    expect(findPullRequestNumber("Mention ticket #123")).toBeNull();
    expect(findPullRequestNumber("Add notes (#123) later")).toBeNull();
  });
});
