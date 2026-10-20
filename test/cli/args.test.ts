import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../../src/cli/args.js";

describe("parseCliArgs", () => {
  it("parses supported flags", () => {
    expect(
      parseCliArgs([
        "--since",
        "v1.0.0",
        "--output",
        "CHANGELOG.md",
        "--stdout",
        "--format",
        "json",
        "--github",
        "--dry-run"
      ])
    ).toEqual({
      since: "v1.0.0",
      output: "CHANGELOG.md",
      stdout: true,
      format: "json",
      github: true,
      dryRun: true,
      help: false,
      version: false
    });
  });

  it("rejects conflicting range flags", () => {
    expect(() => parseCliArgs(["--since", "v1.0.0", "--range", "v1.0.0..HEAD"])).toThrow(
      "Use either --since or --range, not both."
    );
  });

  it("reads a release version after --version and -v", () => {
    expect(parseCliArgs(["--version", "1.2.3"])).toEqual({
      stdout: false,
      format: "markdown",
      github: false,
      dryRun: false,
      help: false,
      version: false,
      releaseVersion: "1.2.3"
    });

    expect(parseCliArgs(["-v", "1.2.3", "--since", "v1.2.2"])).toEqual({
      since: "v1.2.2",
      stdout: false,
      format: "markdown",
      github: false,
      dryRun: false,
      help: false,
      version: false,
      releaseVersion: "1.2.3"
    });
  });

  it("keeps a bare --version as the CLI version flag", () => {
    expect(parseCliArgs(["--version"])).toEqual({
      stdout: false,
      format: "markdown",
      github: false,
      dryRun: false,
      help: false,
      version: true
    });

    expect(parseCliArgs(["--version", "--output", "CHANGELOG.md"])).toMatchObject({
      version: true,
      output: "CHANGELOG.md"
    });
  });

  it("rejects mixing a bare --version with a release version", () => {
    expect(() => parseCliArgs(["--version", "1.2.3", "--version"])).toThrow(
      "Use either --version or --version <version>, not both."
    );
    expect(() => parseCliArgs(["--version", "--version", "1.2.3"])).toThrow(
      "Use either --version or --version <version>, not both."
    );
  });

  it("rejects unsupported formats and unknown flags", () => {
    expect(() => parseCliArgs(["--format", "html"])).toThrow("Unsupported format");
    expect(() => parseCliArgs(["--wat"])).toThrow("Unknown option");
  });
});
