import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GitCommandError extends Error {
  readonly args: string[];
  readonly cwd: string;
  readonly stderr: string;
  readonly exitCode?: number;

  constructor(args: string[], cwd: string, stderr: string, exitCode?: number) {
    super(stderr.trim() || `git ${args.join(" ")} failed`);
    this.name = "GitCommandError";
    this.args = args;
    this.cwd = cwd;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

export async function runGit(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException & {
      stderr?: string;
      code?: number;
    };
    throw new GitCommandError(args, cwd, maybeError.stderr ?? maybeError.message, maybeError.code);
  }
}

export async function assertGitRepository(cwd: string): Promise<void> {
  await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
}
