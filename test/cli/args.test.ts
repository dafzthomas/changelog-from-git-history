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

  it("rejects unsupported formats and unknown flags", () => {
    expect(() => parseCliArgs(["--format", "html"])).toThrow("Unsupported format");
    expect(() => parseCliArgs(["--wat"])).toThrow("Unknown option");
  });
});
