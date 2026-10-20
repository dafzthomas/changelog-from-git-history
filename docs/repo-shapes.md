# Repository shapes

These histories are synthetic Git repositories. The fixture tests create them on the local machine. The tests do not clone a remote, and they do not use the network.

## Squash merges

The history has a `v1.0.0` tag, then a feature branch with two commits. The default branch records one squash commit, `feat: add export command (#8)`. The changelog lists that squash commit. It does not list the two branch commits.

## Repositories with no tags

The history has three commits and no tags. The changelog uses the full history. It warns that no semver-like tag was found.

## Non-GitHub remotes

`origin` is `https://gitlab.com/acme/widgets.git`. The changelog prints the short hash and does not add a commit link. With `--github`, the command warns that origin is not a GitHub remote, and it still prints the local changelog.

## Breaking footers

Two commits after `v1.0.0` include a `BREAKING CHANGE` footer. One subject is a conventional fix. The other subject has no type. Both entries appear under Breaking Changes, and each entry includes the footer text.

## A small project history

This history resembles a small library. It has a readme, a license, a package file, and source files. Two authors commit. `v0.1.0` marks the first release. Later history includes a squash merge, a documentation commit, a dependency bump, and a breaking footer. The default changelog starts at `v0.1.0`. The history is not a copy of a published repository.
