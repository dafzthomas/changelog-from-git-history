import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
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
  const cwd = mkdtempSync(join(tmpdir(), "cfg-github-"));
  git(cwd, ["init", "--quiet"]);
  git(cwd, ["config", "user.name", "Riley"]);
  git(cwd, ["config", "user.email", "riley@example.com"]);
  git(cwd, ["config", "commit.gpgsign", "false"]);
  git(cwd, ["config", "tag.gpgsign", "false"]);
  git(cwd, ["config", "core.fsmonitor", "false"]);
  git(cwd, ["remote", "add", "origin", "https://github.com/acme/widgets.git"]);
  writeFileSync(join(cwd, "file.txt"), "one");
  git(cwd, ["add", "file.txt"]);
  git(cwd, ["commit", "--quiet", "-m", "feat: add export (#321)"]);
  writeFileSync(join(cwd, "file.txt"), "two");
  git(cwd, ["commit", "--quiet", "-am", "Merge pull request #654 from acme/feature"]);
  writeFileSync(join(cwd, "file.txt"), "three");
  git(cwd, ["commit", "--quiet", "-am", "fix: correct parser (#777)."]);
  writeFileSync(join(cwd, "file.txt"), "four");
  git(cwd, ["commit", "--quiet", "-am", "chore: tidy workspace"]);
  return cwd;
}

function createIo(cwd: string) {
  let stdout = "";
  let stderr = "";
  return {
    cwd,
    stdout: {
      write: (chunk: string) => {
        stdout += chunk;
      }
    },
    stderr: {
      write: (chunk: string) => {
        stderr += chunk;
      }
    },
    get stdoutText() {
      return stdout;
    },
    get stderrText() {
      return stderr;
    }
  };
}

function installGh(mode: "ok" | "fail" | "down"): { binDir: string; logPath: string } {
  const root = mkdtempSync(join(tmpdir(), "cfg-gh-"));
  const binDir = join(root, "bin");
  const logPath = join(root, "gh.log");
  mkdirSync(binDir);
  writeFileSync(logPath, "");

  if (mode === "down") {
    return { binDir, logPath };
  }

  const script =
    mode === "ok"
      ? `#!/bin/sh
printf '%s\\n' "$*" >> "$GH_LOG"
if [ "$1" = "--version" ]; then echo "gh version 9"; exit 0; fi
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then exit 0; fi
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '{"title":"Fetched PR %s","url":"https://github.com/acme/widgets/pull/%s","author":{"login":"octo"}}\\n' "$3" "$3"
  exit 0
fi
exit 1
`
      : `#!/bin/sh
printf '%s\\n' "$*" >> "$GH_LOG"
if [ "$1" = "--version" ]; then echo "gh version 9"; exit 0; fi
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then exit 0; fi
echo "api down" >&2
exit 1
`;

  const ghPath = join(binDir, "gh");
  writeFileSync(ghPath, script);
  chmodSync(ghPath, 0o755);
  return { binDir, logPath };
}

function pathWithoutGh(): string {
  return (process.env.PATH ?? "")
    .split(delimiter)
    .filter((entry) => entry && !existsSync(join(entry, "gh")))
    .join(delimiter);
}

function ghEnv(mode: "ok" | "fail" | "down", binDir: string, logPath: string): NodeJS.ProcessEnv {
  const path =
    mode === "down" ? pathWithoutGh() : `${binDir}${delimiter}${process.env.PATH ?? ""}`;
  return { ...process.env, PATH: path, GH_LOG: logPath };
}

async function withGh<T>(
  mode: "ok" | "fail" | "down",
  run: (env: NodeJS.ProcessEnv, logPath: string) => Promise<T>
): Promise<T> {
  const { binDir, logPath } = installGh(mode);
  return run(ghEnv(mode, binDir, logPath), logPath);
}

describe("runCli --github", () => {
  it("enriches squash suffixes and merge subjects when gh can fetch them", async () => {
    const cwd = createRepo();

    const result = await withGh("ok", async (env) => {
      const io = createIo(cwd);
      const exitCode = await runCli(["--format", "json", "--github"], { ...io, env });
      return { exitCode, io };
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.io.stdoutText).entries).toEqual([
      expect.objectContaining({
        summary: "Fetched PR 321",
        prNumber: "321",
        prUrl: "https://github.com/acme/widgets/pull/321",
        prAuthor: "octo"
      }),
      expect.objectContaining({
        summary: "Fetched PR 654",
        prNumber: "654",
        prUrl: "https://github.com/acme/widgets/pull/654"
      }),
      expect.objectContaining({
        summary: "Fetched PR 777",
        prNumber: "777",
        prUrl: "https://github.com/acme/widgets/pull/777"
      }),
      expect.objectContaining({ summary: "Tidy workspace" })
    ]);
    expect(JSON.parse(result.io.stdoutText).entries[3].prNumber).toBeUndefined();
  });

  it("prints markdown titles for the same subjects", async () => {
    const cwd = createRepo();
    const io = createIo(cwd);

    const exitCode = await withGh("ok", (env) => runCli(["--github"], { ...io, env }));

    expect(exitCode).toBe(0);
    expect(io.stdoutText).toContain("Fetched PR 321.");
    expect(io.stdoutText).toContain("Fetched PR 654.");
    expect(io.stdoutText).toContain("Fetched PR 777.");
    expect(io.stdoutText).toContain("Tidy workspace.");
  });

  it("does not call gh unless --github is set", async () => {
    const cwd = createRepo();

    const log = await withGh("ok", async (env, logPath) => {
      const io = createIo(cwd);
      expect(await runCli(["--format", "json"], { ...io, env })).toBe(0);
      expect(io.stdoutText).toContain("Correct parser (#777).");
      expect(io.stdoutText).not.toContain("Fetched PR");
      return execFileSync("cat", [logPath], { encoding: "utf8" });
    });

    expect(log).toBe("");
  });

  it("warns when gh cannot fetch a matched pull request", async () => {
    const cwd = createRepo();

    const result = await withGh("fail", async (env) => {
      const io = createIo(cwd);
      const exitCode = await runCli(["--format", "json", "--github"], { ...io, env });
      return { exitCode, stderr: io.stderrText, stdout: io.stdoutText };
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Could not fetch GitHub PR metadata for #321.");
    expect(result.stderr).toContain("Could not fetch GitHub PR metadata for #654.");
    expect(result.stderr).toContain("Could not fetch GitHub PR metadata for #777.");
    const summaries = JSON.parse(result.stdout).entries.map((entry: { summary: string }) => entry.summary);
    expect(summaries).toEqual([
      "Add export (#321)",
      "Merge pull request #654 from acme/feature",
      "Correct parser (#777).",
      "Tidy workspace"
    ]);
  });

  it("warns when gh is unavailable", async () => {
    const cwd = createRepo();

    const result = await withGh("down", async (env, logPath) => {
      const io = createIo(cwd);
      const exitCode = await runCli(["--github"], { ...io, env });
      return {
        exitCode,
        stderr: io.stderrText,
        log: execFileSync("cat", [logPath], { encoding: "utf8" })
      };
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "GitHub enrichment requested, but gh is unavailable or not authenticated."
    );
    expect(result.log).toBe("");
  });
});
