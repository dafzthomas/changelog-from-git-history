# Security Policy

## Supported Versions

Security fixes are considered for the latest published version of `changelog-from-git-history`.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately by emailing the maintainer at:

```text
dafydd.thomas1@haven.com
```

Include:

- A description of the issue and impact.
- Steps to reproduce.
- Affected versions or commit SHAs, if known.
- Any suggested remediation.

Please do not open a public issue for a vulnerability until it has been triaged.

## Security Notes

The CLI shells out to local `git` and optionally to `gh` when `--github` is used. It does not require hosted services by default and should not send repository data to a network service unless the user explicitly enables GitHub enrichment.
