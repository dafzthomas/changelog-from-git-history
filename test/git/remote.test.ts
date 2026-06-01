import { describe, expect, it } from "vitest";
import { parseGitHubRemote } from "../../src/git/remote.js";

describe("parseGitHubRemote", () => {
  it("parses HTTPS GitHub remotes", () => {
    const remote = parseGitHubRemote("https://github.com/acme/widgets.git");

    expect(remote).toEqual({
      owner: "acme",
      repo: "widgets",
      webUrl: "https://github.com/acme/widgets"
    });
    expect(remote?.commitUrl("abcdef1")).toBe("https://github.com/acme/widgets/commit/abcdef1");
  });

  it("allows common GitHub owner and repository characters", () => {
    expect(parseGitHubRemote("https://github.com/acme-inc/widget.tool.git")).toMatchObject({
      owner: "acme-inc",
      repo: "widget.tool",
      webUrl: "https://github.com/acme-inc/widget.tool"
    });
  });

  it("ignores surrounding whitespace", () => {
    expect(parseGitHubRemote("  https://github.com/acme/widgets.git\n")).toMatchObject({
      owner: "acme",
      repo: "widgets"
    });
  });

  it("parses SSH GitHub remotes", () => {
    expect(parseGitHubRemote("git@github.com:acme/widgets.git")).toMatchObject({
      owner: "acme",
      repo: "widgets",
      webUrl: "https://github.com/acme/widgets"
    });
    expect(parseGitHubRemote("ssh://git@github.com/acme/widgets")).toMatchObject({
      owner: "acme",
      repo: "widgets",
      webUrl: "https://github.com/acme/widgets"
    });
  });

  it("returns null for non-GitHub remotes", () => {
    expect(parseGitHubRemote("git@example.com:acme/widgets.git")).toBeNull();
    expect(parseGitHubRemote("https://gitlab.com/acme/widgets.git")).toBeNull();
  });
});
