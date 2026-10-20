# changelog-from-git-history

`changelog-from-git-history` is a fast local CLI that turns recent Git commits into a release-ready changelog.
Primary command: `changelog-from-git-history`
Alias: `git-changelog-fast`

## What it does

- Reads commit history from the current Git repository
- Resolves the range automatically (latest semver-like tag → `HEAD`) or from explicit flags
- Classifies changes into readable sections (features, fixes, docs, dependencies, etc.)
- Detects breaking changes and places them in a dedicated section
- Adds commit hashes and authors to each entry
- Renders output in Markdown (default) or JSON
- Optionally enriches entries with GitHub PR metadata when available

## Install

```bash
npm install -g changelog-from-git-history
```

You can also run with `npx`:

```bash
npx changelog-from-git-history --help
```

## Basic usage

```bash
changelog-from-git-history
```

This prints a Markdown changelog to stdout.

If run with no tags yet in the repo, the tool scans from the first commit and warns:

```text
No semver-like tag found; using full history.
```

## Flags

### `--since <ref>`

Generate from a specific ref to `HEAD`.

```bash
changelog-from-git-history --since v1.2.0
```

### `--range <from..to>`

Generate from an explicit Git revision range.

```bash
changelog-from-git-history --range v1.0.0..v1.2.0
```

- Uses the form `<from>..<to>` only.
- `...` is rejected.

### `--output, -o <file>`

Writes or updates a changelog file.

When Markdown output is enabled:

- Creates the file if it does not exist.
- Adds a `# Changelog` heading if missing.
- Inserts the new section above existing release content.
- Avoids inserting the same generated section twice.

When JSON output is selected, it writes raw JSON content to the file.

```bash
changelog-from-git-history --output CHANGELOG.md
```

### `--stdout`

Useful with `--output`: print the generated content to stdout while still writing the file.

Without `--output`, output goes to stdout anyway, so `--stdout` is effectively harmlessly redundant.

### `--format markdown|json`

Select output format.

- `markdown` (default): human-readable changelog with sections
- `json`: structured result matching the internal `ChangelogData` payload

```bash
changelog-from-git-history --format json
changelog-from-git-history --format json --output release-notes.json
```

### `--include <categories>`

Keep only these categories.

Category ids follow the default section order. They are `features`, `fixes`, `documentation`, `performance`, `refactors`, `tests`, `build`, `dependencies`, `maintenance`, and `other`. The docs id is `documentation`.

Separate ids with commas. Spaces around commas are optional. Repeat `--include` to add ids.

An unknown category name fails before Git runs.

```bash
changelog-from-git-history --include features,fixes
changelog-from-git-history --include features --include documentation
```

### `--exclude <categories>`

Drop these categories. Use the same category ids as `--include`.

Separate ids with commas. Spaces around commas are optional. Repeat `--exclude` to add ids.

`--include` and `--exclude` can be used together. The command keeps the included ids, then removes the excluded ids. Omit `--include` to start from every id.

Markdown and JSON use the same selection. JSON stays a `ChangelogData` object. Dropped entries are absent.

A breaking change stays in the first section when its category is included. The command omits that change when its category is excluded.

```bash
changelog-from-git-history --exclude tests,build,maintenance
changelog-from-git-history --include features,fixes,documentation --exclude documentation
```

### `--github`

Replaces a matching commit subject with the GitHub pull request title. The CLI calls `gh` only when you pass this flag.

Supported subjects:

- Squash suffixes, with an optional trailing `.`, `!`, or `?`. For example, `Add export (#123)` and `Correct parser (#123).`
- Merge subjects. For example, `Merge pull request #123` and `Merge pull request #123 from owner/branch`.

`origin` must be a GitHub remote. `gh` must be installed and authenticated. If enrichment cannot run, the CLI still prints the changelog from local commits and writes a warning to stderr:

```text
GitHub enrichment requested, but gh is unavailable or not authenticated.
Could not fetch GitHub PR metadata for #123.
```

### `--dry-run`

Preview generation and output without writing `--output` files.

```bash
changelog-from-git-history --output CHANGELOG.md --dry-run
```

You’ll see a preview in stdout and a non-writing warning on stderr.

### `--help`, `-h`

```bash
changelog-from-git-history --help
```

### `--version [version]`, `-v`

With no value, the command prints the CLI version and exits.

```bash
changelog-from-git-history --version
```

With a version, the section heading uses that version instead of `Unreleased`. The heading date is the UTC date of the run, formatted as `YYYY-MM-DD`.

```bash
changelog-from-git-history --version 1.2.3 --since v1.2.2 --output CHANGELOG.md
```

```markdown
## 1.2.3 - YYYY-MM-DD
```

If `CHANGELOG.md` already has that Git range, the command leaves the file unchanged.

## Output examples

### Conventional commits

Input history:

```text
feat(parser): add CSV import
fix(core): validate token format
docs(readme): update usage examples
```

Typical rendered sections:

- **Features**
- **Fixes**
- **Documentation**

### Messy commits

Input history:

```text
Add CSV export for reports
resolve stale cache detection
Update README usage examples
Bump package dependencies
breaking: remove legacy config keys
```

The CLI still classifies these into useful buckets (for example Features, Fixes, Documentation, Dependencies, and Other) and can still include unknown entries rather than failing.

## Notes on behavior

- Warnings are written to stderr.
- The Markdown renderer includes an embedded range marker comment:

```text
<!-- changelog-from-git-history: <from>..<to> -->
```

- If no GitHub link is available (non-GitHub remote), it still renders cleanly and omits links.
- Entry order is stable enough for review and release notes, with breaking changes promoted first.

## Covered repository shapes

Local fixture tests cover squash merges, repositories with no tags, non-GitHub remotes, breaking-change footers, and one small project history. [Repository shapes](docs/repo-shapes.md) lists each history. Those tests do not use the network.

## Development checks

```bash
npm test
npm run typecheck
npm run build
```

## Roadmap

- Add richer templates for Markdown/JSON consumers
- Add CI guidance and publish release notes helpers

## Contributing

- Install dependencies with your preferred Node toolchain
- Run tests before opening a change
- Keep parser behavior and classification behavior covered by tests
- Prefer backward-compatible output when possible, especially around existing `CHANGELOG.md` content preservation
