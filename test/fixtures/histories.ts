import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type Author = {
  name: string;
  email: string;
};

export type HistoryFixture = {
  cwd: string;
};

const ADA: Author = {
  name: "Ada Lovelace",
  email: "ada@example.com"
};

const GRACE: Author = {
  name: "Grace Hopper",
  email: "grace@example.com"
};

type CommitInput = {
  file: string;
  content: string;
  message: string;
  body?: string;
  author?: Author;
};

type Repo = {
  cwd: string;
  commit(input: CommitInput): void;
  tag(name: string): void;
  branch(): string;
  checkout(name: string): void;
  checkoutNew(name: string): void;
  remote(url: string): void;
  squashMerge(branch: string, message: string, body?: string, author?: Author): void;
};

function git(cwd: string, args: string[], author: Author, when?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: author.name,
      GIT_AUTHOR_EMAIL: author.email,
      GIT_COMMITTER_NAME: author.name,
      GIT_COMMITTER_EMAIL: author.email,
      ...(when
        ? {
            GIT_AUTHOR_DATE: when,
            GIT_COMMITTER_DATE: when
          }
        : {})
    }
  }).trim();
}

function createRepo(prefix: string): Repo {
  const cwd = mkdtempSync(join(tmpdir(), prefix));
  let tick = 1;

  const run = (args: string[], author: Author = ADA, stamp = false): string => {
    const when = stamp ? `2024-05-${String(tick).padStart(2, "0")}T15:00:00+0000` : undefined;
    if (stamp) {
      tick += 1;
    }
    return git(cwd, args, author, when);
  };

  run(["init", "--quiet"]);
  run(["config", "user.name", ADA.name]);
  run(["config", "user.email", ADA.email]);
  run(["config", "commit.gpgsign", "false"]);
  run(["config", "tag.gpgsign", "false"]);

  return {
    cwd,
    commit(input) {
      const author = input.author ?? ADA;
      const path = join(cwd, input.file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, input.content);
      run(["add", input.file], author);
      const args = ["commit", "--quiet", "-m", input.message];
      if (input.body) {
        args.push("-m", input.body);
      }
      run(args, author, true);
    },
    tag(name) {
      run(["tag", name]);
    },
    branch() {
      return run(["branch", "--show-current"]);
    },
    checkout(name) {
      run(["checkout", "-q", name]);
    },
    checkoutNew(name) {
      run(["checkout", "-q", "-b", name]);
    },
    remote(url) {
      run(["remote", "add", "origin", url]);
    },
    squashMerge(branch, message, body, author = ADA) {
      run(["merge", "--squash", branch], author);
      const args = ["commit", "--quiet", "-m", message];
      if (body) {
        args.push("-m", body);
      }
      run(args, author, true);
    }
  };
}

export function createSquashMergeHistory(): HistoryFixture {
  const repo = createRepo("cfg-squash-");
  repo.commit({
    file: "README.md",
    content: "# widgets\n",
    message: "chore: initial import"
  });
  repo.tag("v1.0.0");
  const base = repo.branch();
  repo.checkoutNew("export-command");
  repo.commit({
    file: "export.js",
    content: "export function run() {}\n",
    message: "feat: add export command"
  });
  repo.commit({
    file: "export.js",
    content: "export function run(name) { if (!name) throw new Error('blank'); }\n",
    message: "fix: reject blank names"
  });
  repo.checkout(base);
  repo.squashMerge(
    "export-command",
    "feat: add export command (#8)",
    "* feat: add export command\n* fix: reject blank names\n"
  );
  return { cwd: repo.cwd };
}

export function createUntaggedHistory(): HistoryFixture {
  const repo = createRepo("cfg-notags-");
  repo.commit({
    file: "parser.js",
    content: "export function parse() {}\n",
    message: "feat: add parser"
  });
  repo.commit({
    file: "parser.js",
    content: "export function parse(input) { if (!input) return null; }\n",
    message: "fix: repair empty input"
  });
  repo.commit({
    file: "README.md",
    content: "# parser\n",
    message: "docs: update the readme"
  });
  return { cwd: repo.cwd };
}

export function createNonGitHubRemoteHistory(): HistoryFixture {
  const repo = createRepo("cfg-gitlab-");
  repo.remote("https://gitlab.com/acme/widgets.git");
  repo.commit({
    file: "parser.js",
    content: "export function parse() {}\n",
    message: "chore: initial import"
  });
  repo.tag("v1.0.0");
  repo.commit({
    file: "parser.js",
    content: "export function parse(input) { return input; }\n",
    message: "feat: add parser"
  });
  return { cwd: repo.cwd };
}

export function createBreakingFooterHistory(): HistoryFixture {
  const repo = createRepo("cfg-breaking-");
  repo.commit({
    file: "config.js",
    content: "export const path = 'config.yml';\n",
    message: "chore: initial import"
  });
  repo.tag("v1.0.0");
  repo.commit({
    file: "token.js",
    content: "export function token(value) { return `Bearer ${value}`; }\n",
    message: "fix: change token parsing",
    body: "BREAKING CHANGE: tokens must now be prefixed with Bearer."
  });
  repo.commit({
    file: "config.js",
    content: "export const path = 'config.json';\n",
    message: "remove old config loader",
    body: "BREAKING CHANGE: config files must now be JSON."
  });
  return { cwd: repo.cwd };
}

export function createSmallOssHistory(): HistoryFixture {
  const repo = createRepo("cfg-tiny-notes-");
  repo.remote("https://github.com/example/tiny-notes.git");
  repo.commit({
    file: "README.md",
    content: "# tiny-notes\n",
    message: "Initial commit"
  });
  repo.commit({
    file: "LICENSE",
    content: "MIT\n",
    message: "docs: add a license"
  });
  repo.commit({
    file: "package.json",
    content: "{\"name\":\"tiny-notes\",\"version\":\"0.1.0\"}\n",
    message: "chore: add package metadata"
  });
  repo.commit({
    file: "src/index.js",
    content: "export function title(note) { return note.title; }\n",
    message: "feat: parse a note title"
  });
  repo.tag("v0.1.0");

  const base = repo.branch();
  repo.checkoutNew("note-search");
  repo.commit({
    file: "src/search.js",
    content: "export function search(notes, query) { return notes.filter((note) => note.body.includes(query)); }\n",
    message: "feat: index note bodies",
    author: GRACE
  });
  repo.commit({
    file: "src/search.js",
    content: "export function search(notes, query) { return notes.filter((note) => note.body && note.body.includes(query)); }\n",
    message: "fix: skip empty notes",
    author: GRACE
  });
  repo.checkout(base);
  repo.squashMerge(
    "note-search",
    "feat: add note search (#3)",
    "* feat: index note bodies\n* fix: skip empty notes\n",
    GRACE
  );
  repo.commit({
    file: "README.md",
    content: "# tiny-notes\n\nSearch notes with `search(notes, query)`.\n",
    message: "docs: explain the search flag"
  });
  repo.commit({
    file: "package.json",
    content: "{\"name\":\"tiny-notes\",\"version\":\"0.2.0\"}\n",
    message: "Bump package dependencies",
    author: GRACE
  });
  repo.commit({
    file: "src/index.js",
    content: "export function title(note) { return note.title.replace(/^#+\\s*/, ''); }\n",
    message: "feat: drop the title prefix",
    body: "BREAKING CHANGE: titles no longer include a hash prefix."
  });
  return { cwd: repo.cwd };
}
