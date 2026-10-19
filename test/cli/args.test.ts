import { describe, expect, it } from "vitest";
import { helpText, parseCliArgs } from "../../src/cli/args.js";

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

  it("omits categories when include and exclude are absent", () => {
    expect(parseCliArgs([])).not.toHaveProperty("categories");
    expect(parseCliArgs(["--since", "v1.0.0"])).not.toHaveProperty("categories");
  });

  it("unions repeated include lists into section order", () => {
    const options = parseCliArgs(["--include", "features, fixes", "--include", "documentation"]);

    expect([...(options.categories ?? [])]).toEqual(["features", "fixes", "documentation"]);
  });

  it("starts from every category when only exclude is set", () => {
    const options = parseCliArgs(["--exclude", "tests,build"]);

    expect([...(options.categories ?? [])]).toEqual([
      "features",
      "fixes",
      "documentation",
      "performance",
      "refactors",
      "dependencies",
      "maintenance",
      "other"
    ]);
  });

  it("removes excluded ids from the included ids", () => {
    const options = parseCliArgs([
      "--include",
      "features,fixes,documentation",
      "--exclude",
      "documentation"
    ]);

    expect([...(options.categories ?? [])]).toEqual(["features", "fixes"]);
  });

  it("keeps an empty category set when every included id is excluded", () => {
    const options = parseCliArgs(["--include", "features", "--exclude", "features"]);

    expect(options.categories).toEqual(new Set());
  });

  it("rejects unknown, blank, and missing category names", () => {
    expect(() => parseCliArgs(["--include", "feat"])).toThrow(
      'Unknown category "feat". Expected one of: features, fixes, documentation, performance, refactors, tests, build, dependencies, maintenance, other.'
    );
    expect(() => parseCliArgs(["--include", "docs"])).toThrow('Unknown category "docs"');
    expect(() => parseCliArgs(["--include", "Features"])).toThrow('Unknown category "Features"');
    expect(() => parseCliArgs(["--exclude", "breaking"])).toThrow('Unknown category "breaking"');
    expect(() => parseCliArgs(["--include", "features,"])).toThrow("Expected a category name.");
    expect(() => parseCliArgs(["--include"])).toThrow("Expected a value after --include.");
    expect(() => parseCliArgs(["--exclude"])).toThrow("Expected a value after --exclude.");
  });

  it("documents include and exclude in help text", () => {
    const help = helpText();

    expect(help).toContain("  --include <categories>     Keep only these categories, comma-separated");
    expect(help).toContain("  --exclude <categories>     Drop these categories, comma-separated");
    expect(help.indexOf("--format")).toBeLessThan(help.indexOf("--include"));
    expect(help.indexOf("--include")).toBeLessThan(help.indexOf("--exclude"));
    expect(help.indexOf("--exclude")).toBeLessThan(help.indexOf("--github"));
  });
});
