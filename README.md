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

### `--github`

Attempts optional GitHub enrichment:

- Reads `origin` remote (if it is GitHub)
- Uses `gh` CLI when installed and authenticated
- Uses PR metadata for commit lines matching `(#123)` patterns where possible

This is optional and not required. If enrichment cannot run, it continues with local data and warns:

```text
GitHub enrichment requested, but gh is unavailable or not authenticated.
```

### `--dry-run`

Preview generation and output without writing `--output` files.

```bash
changelog-from-git-history --output CHANGELOG.md --dry-run
```

You’ll see a preview in stdout and a non-writing warning on stderr.

### `--help`, `--version`

```bash
changelog-from-git-history --help
changelog-from-git-history --version
```

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

## Development checks

```bash
npm test
npm run typecheck
npm run build
```

## Roadmap

- Add richer templates for Markdown/JSON consumers
- Add optional section toggles and filtering by type
- Improve PR-matching heuristics for non-`(#123)` merge formats
- Add CI guidance and publish release notes helpers

## Contributing

- Install dependencies with your preferred Node toolchain
- Run tests before opening a change
- Keep parser behavior and classification behavior covered by tests
- Prefer backward-compatible output when possible, especially around existing `CHANGELOG.md` content preservation
