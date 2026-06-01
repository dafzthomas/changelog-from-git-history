# Contributing

Thanks for helping improve `changelog-from-git-history`.

## Local Setup

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The CLI can be exercised locally after a build:

```bash
node dist/cli/index.js --help
node dist/cli/index.js --stdout
```

## Development Guidelines

- Keep parser and renderer changes covered by tests.
- Prefer small, focused pull requests with a clear behavior change.
- Preserve existing `CHANGELOG.md` content when changing insertion behavior.
- Keep the CLI useful without network access or GitHub authentication.
- Avoid introducing runtime dependencies unless they materially improve the MVP.

## Commit Style

Conventional commits are preferred because they make the generated changelog more useful:

```text
feat(cli): add release title option
fix(git): handle repositories without tags
docs(readme): clarify dry-run behavior
```

Messy commits are still supported, but clear subjects help maintainers.

## Pull Requests

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
```

Include a short summary, validation steps, and any compatibility concerns.
