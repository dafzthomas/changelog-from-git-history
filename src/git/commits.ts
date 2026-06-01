import type { GitCommit } from "../core/commit.js";
import { runGit } from "./git.js";

const RECORD_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\x1f";

export async function readCommits(cwd: string, revisionRange = "HEAD"): Promise<GitCommit[]> {
  const format = `${RECORD_SEPARATOR}${[
    "%H",
    "%h",
    "%an",
    "%ae",
    "%ad",
    "%s",
    "%b"
  ].join(FIELD_SEPARATOR)}`;

  const stdout = await runGit(
    ["log", "--reverse", "--date=short", `--format=${format}`, revisionRange],
    cwd
  );

  return stdout
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map(parseCommitRecord);
}

function parseCommitRecord(record: string): GitCommit {
  const [hash, shortHash, authorName, authorEmail, authorDate, subject, ...bodyParts] =
    record.split(FIELD_SEPARATOR);

  return {
    hash,
    shortHash,
    subject,
    body: bodyParts.join(FIELD_SEPARATOR).trim(),
    authorName,
    authorEmail,
    authorDate
  };
}
