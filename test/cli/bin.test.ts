import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isDirectCliExecution } from "../../src/cli/index.js";

describe("isDirectCliExecution", () => {
  it("recognizes execution through a package manager bin symlink", () => {
    const cwd = mkdtempSync(join(tmpdir(), "cfg-bin-"));
    const target = join(cwd, "dist-cli-index.js");
    const link = join(cwd, "changelog-from-git-history");
    writeFileSync(target, "#!/usr/bin/env node\n");
    symlinkSync(target, link);

    expect(isDirectCliExecution(pathToFileURL(target).href, link)).toBe(true);
  });

  it("returns false for an imported module", () => {
    const modulePath = resolve("src/cli/index.ts");

    expect(isDirectCliExecution(pathToFileURL(modulePath).href, undefined)).toBe(false);
  });
});
