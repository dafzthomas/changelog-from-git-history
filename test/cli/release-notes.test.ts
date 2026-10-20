import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url));

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "commit.gpgsign=false", "-c", "core.fsmonitor=false", ...args], {
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

function commit(cwd: string, message: string, body?: string): string {
  const args = ["commit", "--quiet", "-m", message];
  if (body) {
    args.push("-m", body);
  }
  writeFileSync(join(cwd, "file.txt"), message);
  git(cwd, ["add", "file.txt"]);
  git(cwd, args);
  return git(cwd, ["rev-parse", "--short", "HEAD"]);
}

function createRepo(): { cwd: string; feature: string; fix: string; docs: string } {
  const cwd = mkdtempSync(join(tmpdir(), "cfg-release-notes-"));
  git(cwd, ["init", "--quiet"]);
  git(cwd, ["config", "user.name", "Riley"]);
  git(cwd, ["config", "user.email", "riley@example.com"]);
  commit(cwd, "chore: import the project");
  git(cwd, ["tag", "v0.1.0"]);
  const feature = commit(cwd, "feat: add export command");
  const fix = commit(cwd, "fix!: change config file format", "BREAKING CHANGE: Config files must use JSON.");
  const docs = commit(cwd, "docs: update the readme");
  return { cwd, feature, fix, docs };
}

function runCli(cwd: string, args: string[]) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  delete env.NODE_OPTIONS;
  delete env.NODE_CHANNEL_FD;

  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000
  });
}

describe("release notes CLI", () => {
  it("prints compact notes from the CLI and keeps the default changelog", () => {
    const repo = createRepo();
    const help = runCli(repo.cwd, ["--help"]);
    const changelog = runCli(repo.cwd, []);
    const explicitMarkdown = runCli(repo.cwd, ["--format", "markdown"]);
    const notes = runCli(repo.cwd, ["--format", "release-notes"]);

    expect(help.status).toBe(0);
    expect(help.stdout).toContain("--format <markdown|json|release-notes>");

    expect(changelog.status).toBe(0);
    expect(explicitMarkdown.status).toBe(0);
    expect(changelog.stdout).toBe(explicitMarkdown.stdout);
    expect(changelog.stderr).toBe(explicitMarkdown.stderr);
    expect(changelog.stdout).toContain("## Unreleased - ");
    expect(changelog.stdout).toContain("<!-- changelog-from-git-history: v0.1.0..HEAD -->");
    expect(changelog.stdout).not.toContain("## What's Changed");

    expect(notes.status).toBe(0);
    expect(notes.stderr).toBe("");
    expect(notes.stdout).toBe(`## What's Changed

### Breaking Changes

* Change config file format. Config files must use JSON by Riley in ${repo.fix}

### Features

* Add export command by Riley in ${repo.feature}

### Documentation

* Update the readme by Riley in ${repo.docs}

## Contributors

* Riley

**Full Changelog**: v0.1.0...HEAD
`);
    expect(notes.stdout).not.toContain("<!-- changelog-from-git-history:");
    expect(notes.stdout).not.toContain("## Unreleased");
  });

  it("writes the release body without inserting a changelog heading", () => {
    const repo = createRepo();
    const printed = runCli(repo.cwd, ["--format", "release-notes"]);
    const written = runCli(repo.cwd, ["--format", "release-notes", "--output", "RELEASE_NOTES.md"]);
    const output = readFileSync(join(repo.cwd, "RELEASE_NOTES.md"), "utf8");

    expect(written.status).toBe(0);
    expect(written.stderr).toContain("Wrote RELEASE_NOTES.md");
    expect(output).toBe(printed.stdout);
    expect(output.startsWith("## What's Changed\n")).toBe(true);
    expect(output).not.toContain("# Changelog");
  });
});
