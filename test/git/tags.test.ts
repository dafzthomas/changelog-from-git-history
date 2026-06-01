import { describe, expect, it } from "vitest";
import { isSemverLikeTag, pickLatestSemverTag } from "../../src/git/tags.js";

describe("semver tag helpers", () => {
  it("recognizes semver-like tags with optional v prefix and prerelease", () => {
    expect(isSemverLikeTag("v1.2.3")).toBe(true);
    expect(isSemverLikeTag("1.2.3-beta.1")).toBe(true);
    expect(isSemverLikeTag("release-1.2.3")).toBe(false);
  });

  it("picks the newest semver-like tag from git-sorted tag names", () => {
    expect(pickLatestSemverTag(["latest", "v2.0.0", "v1.9.0"])).toBe("v2.0.0");
    expect(pickLatestSemverTag(["nightly", "release"])).toBeNull();
  });
});
