import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Riley",
      GIT_AUTHOR_EMAIL: "riley@example.com",
      GIT_COMMITTER_NAME: "Riley",
      GIT_COMMITTER_EMAIL: "riley@example.com"
    }
  }).trim();
}

function createRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), "cfg-cli-"));
  git(cwd, ["init", "--quiet"]);
  git(cwd, ["config", "user.name", "Riley"]);
  git(cwd, ["config", "user.email", "riley@example.com"]);
  writeFileSync(join(cwd, "file.txt"), "one");
  git(cwd, ["add", "file.txt"]);
  git(cwd, ["commit", "--quiet", "-m", "feat: initial feature"]);
  return cwd;
}

function createIo(cwd: string) {
  let stdout = "";
  let stderr = "";
  return {
    cwd,
    stdout: { write: (chunk: string) => { stdout += chunk; } },
    stderr: { write: (chunk: string) => { stderr += chunk; } },
    get stdoutText() {
      return stdout;
    },
    get stderrText() {
      return stderr;
    }
  };
}

describe("runCli", () => {
  it("prints help and version without reading git", async () => {
    const io = createIo("/tmp");

    await expect(runCli(["--help"], io)).resolves.toBe(0);
    expect(io.stdoutText).toContain("Usage: changelog-from-git-history");
    expect(io.stdoutText).toContain("--version, -v [version]");
    expect(io.stdoutText).toContain("set the release heading");

    const versionIo = createIo("/tmp");
    await expect(runCli(["--version"], versionIo)).resolves.toBe(0);
    expect(versionIo.stdoutText).toBe("0.1.0\n");
  });

  it("prints generated markdown to stdout by default", async () => {
    const io = createIo(createRepo());

    await expect(runCli(["--stdout"], io)).resolves.toBe(0);

    expect(io.stdoutText).toContain("## Unreleased - ");
    expect(io.stdoutText).toContain("### Features");
    expect(io.stderrText).toContain("No semver-like tag found; using full history.");
  });

  it("prints JSON when requested", async () => {
    const io = createIo(createRepo());

    await expect(runCli(["--format", "json"], io)).resolves.toBe(0);

    expect(JSON.parse(io.stdoutText)).toMatchObject({
      entries: [{ category: "features", summary: "Initial feature" }]
    });
  });

  it("previews output without writing when --dry-run is used", async () => {
    const cwd = createRepo();
    const io = createIo(cwd);
    const output = join(cwd, "CHANGELOG.md");

    await expect(runCli(["--output", "CHANGELOG.md", "--dry-run"], io)).resolves.toBe(0);

    expect(io.stdoutText).toContain("## Unreleased - ");
    expect(io.stderrText).toContain("Dry run: not writing CHANGELOG.md");
    expect(existsSync(output)).toBe(false);
  });

  it("creates or updates a markdown changelog file when --output is used", async () => {
    const cwd = createRepo();
    const io = createIo(cwd);
    const output = join(cwd, "CHANGELOG.md");

    await expect(runCli(["--output", "CHANGELOG.md"], io)).resolves.toBe(0);

    expect(readFileSync(output, "utf8")).toContain("# Changelog\n\n## Unreleased - ");
    expect(io.stdoutText).toBe("");
    expect(io.stderrText).toContain("Wrote CHANGELOG.md");
  });

  it("labels the section with --version and leaves the rest of the output unchanged", async () => {
    const cwd = createRepo();
    const plain = createIo(cwd);
    const released = createIo(cwd);

    await expect(runCli([], plain)).resolves.toBe(0);
    await expect(runCli(["--version", "1.2.3"], released)).resolves.toBe(0);

    const plainHeading = plain.stdoutText.match(/^## .+$/m)?.[0];
    const releasedHeading = released.stdoutText.match(/^## .+$/m)?.[0];

    expect(plainHeading).toMatch(/^## Unreleased - \d{4}-\d{2}-\d{2}$/);
    expect(releasedHeading).toMatch(/^## 1\.2\.3 - \d{4}-\d{2}-\d{2}$/);
    expect(released.stdoutText).not.toContain("Unreleased");
    expect(released.stdoutText).not.toBe("0.1.0\n");
    expect(released.stdoutText.replace(releasedHeading ?? "", plainHeading ?? "")).toBe(plain.stdoutText);
  });

  it("writes a versioned changelog once and skips the same range on the next run", async () => {
    const cwd = createRepo();
    const output = join(cwd, "CHANGELOG.md");
    const io = createIo(cwd);

    await expect(runCli(["--version", "1.2.3", "--output", "CHANGELOG.md"], io)).resolves.toBe(0);

    const written = readFileSync(output, "utf8");
    expect(written).toMatch(/^# Changelog\n\n## 1\.2\.3 - \d{4}-\d{2}-\d{2}\n/);
    expect(written).not.toContain("## Unreleased");

    const again = createIo(cwd);
    await expect(runCli(["--version", "1.2.3", "--output", "CHANGELOG.md"], again)).resolves.toBe(0);
    expect(readFileSync(output, "utf8")).toBe(written);
    expect(again.stderrText).toContain("Wrote CHANGELOG.md");
  });

  it("fails clearly outside a Git repository", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "cfg-not-git-"));
    const io = createIo(cwd);

    await expect(runCli([], io)).resolves.toBe(1);

    expect(io.stderrText).toContain("Not a Git repository");
  });
});
