#!/usr/bin/env node
import { constants, realpathSync } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { insertChangelogSection } from "../changelog/insert.js";
import { generateChangelog } from "../core/generate.js";
import { GitCommandError } from "../git/git.js";
import { helpText, parseCliArgs } from "./args.js";

const VERSION = "0.1.0";

type WritableLike = {
  write(chunk: string): unknown;
};

export type CliRuntime = {
  cwd?: string;
  stdout?: WritableLike;
  stderr?: WritableLike;
};

export async function runCli(argv = process.argv.slice(2), runtime: CliRuntime = {}): Promise<number> {
  const stdout = runtime.stdout ?? process.stdout;
  const stderr = runtime.stderr ?? process.stderr;
  const cwd = runtime.cwd ?? process.cwd();

  try {
    const options = parseCliArgs(argv);

    if (options.help) {
      stdout.write(helpText());
      return 0;
    }

    if (options.version) {
      stdout.write(`${VERSION}\n`);
      return 0;
    }

    const result = await generateChangelog({
      cwd,
      since: options.since,
      range: options.range,
      format: options.format,
      github: options.github
    });

    for (const warning of result.data.warnings) {
      stderr.write(`${warning}\n`);
    }

    if (!options.output) {
      stdout.write(result.content);
      return 0;
    }

    const outputPath = resolveOutputPath(cwd, options.output);

    if (options.dryRun) {
      stdout.write(result.content);
      stderr.write(`Dry run: not writing ${options.output}\n`);
      return 0;
    }

    if (options.format === "markdown") {
      const existing = await readExistingFile(outputPath);
      await writeFile(outputPath, insertChangelogSection(existing, result.content), "utf8");
    } else {
      await writeFile(outputPath, result.content, "utf8");
    }

    if (options.stdout) {
      stdout.write(result.content);
    } else {
      stderr.write(`Wrote ${options.output}\n`);
    }

    return 0;
  } catch (error) {
    stderr.write(`${formatCliError(error)}\n`);
    return 1;
  }
}

function resolveOutputPath(cwd: string, output: string): string {
  return isAbsolute(output) ? output : resolve(cwd, output);
}

async function readExistingFile(path: string): Promise<string> {
  try {
    await access(path, constants.F_OK);
    return await readFile(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function formatCliError(error: unknown): string {
  if (error instanceof GitCommandError) {
    if (error.stderr.includes("not a git repository")) {
      return "Not a Git repository. Run this command inside a local Git checkout.";
    }
    return error.stderr.trim() || error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

export function isDirectCliExecution(moduleUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvPath);
  } catch {
    return false;
  }
}

if (isDirectCliExecution(import.meta.url, process.argv[1])) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
