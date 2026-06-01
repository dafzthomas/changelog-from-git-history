# Usage Evidence

Date: 2026-06-01

This file records a small public-readiness smoke test before the `v0.1.0` release.

## Self-Run Against This Repository

Command:

```bash
node dist/cli/index.js --stdout --range 7a31888..HEAD
```

Output:

```markdown
## Unreleased - 2026-06-01

<!-- changelog-from-git-history: 7a31888..HEAD -->

### Fixes

- Run cli through package bin symlinks. ([a46ad8d](https://github.com/dafzthomas/changelog-from-git-history/commit/a46ad8de77ef3e3da867b86fa47efc993a5f15f2)) - Dafydd Thomas

### Contributors

- Dafydd Thomas
```

## Downstream Tarball Install

Package was packed locally with:

```bash
npm pack --pack-destination /tmp/cfgh-evidence-2QByeE
```

Temporary downstream repository setup:

```bash
git init
git commit -m "chore: initial import"
git tag v0.1.0
git commit -m "feat: add export command"
git commit -m "fix!: change config file format"
npm install --save-dev /tmp/cfgh-evidence-2QByeE/changelog-from-git-history-0.1.0.tgz
npx changelog-from-git-history --stdout
```

Output:

```markdown
## Unreleased - 2026-06-01

<!-- changelog-from-git-history: v0.1.0..HEAD -->

### Breaking Changes

- Change config file format. (29b8958) - Downstream Maintainer
  - Breaking change.

### Features

- Add export command. (a245744) - Downstream Maintainer

### Contributors

- Downstream Maintainer
```

## Notes

- The downstream run exercised the package bin through `node_modules/.bin` via `npx`.
- It caught and verified the package-bin symlink execution fix before npm publish.
- The downstream run required no GitHub remote or network service beyond local npm tarball installation.
