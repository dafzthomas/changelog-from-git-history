import { describe, expect, it } from "vitest";
import { insertChangelogSection } from "../../src/changelog/insert.js";

const generated = "## Unreleased - 2026-06-01\n\n### Features\n\n- Added JSONL import.\n";

describe("insertChangelogSection", () => {
  it("creates a changelog document when the file is empty", () => {
    expect(insertChangelogSection("", generated)).toBe(`# Changelog

${generated}`);
  });

  it("inserts below an existing Changelog heading", () => {
    const existing = "# Changelog\n\n## 1.0.0 - 2026-05-01\n\n- Initial release.\n";

    expect(insertChangelogSection(existing, generated)).toBe(`# Changelog

${generated}
## 1.0.0 - 2026-05-01

- Initial release.
`);
  });

  it("prepends when there is no top-level changelog heading", () => {
    const existing = "## 1.0.0 - 2026-05-01\n\n- Initial release.\n";

    expect(insertChangelogSection(existing, generated)).toBe(`${generated}
## 1.0.0 - 2026-05-01

- Initial release.
`);
  });

  it("does not duplicate an identical generated section", () => {
    const existing = `# Changelog\n\n${generated}`;

    expect(insertChangelogSection(existing, generated)).toBe(existing);
  });

  it("does not duplicate a section with the same generated range marker", () => {
    const existing = `# Changelog

## Unreleased - 2026-06-01

<!-- changelog-from-git-history: v1.0.0..HEAD -->

### Features

- Older render.
`;
    const updated = `## Unreleased - 2026-06-02

<!-- changelog-from-git-history: v1.0.0..HEAD -->

### Features

- Newer render.
`;

    expect(insertChangelogSection(existing, updated)).toBe(existing);
  });

  it("does not insert a versioned section when that range is already present", () => {
    const existing = `# Changelog

## Unreleased - 2026-06-01

<!-- changelog-from-git-history: v1.2.2..HEAD -->

### Features

- Older render.
`;
    const released = `## 1.2.3 - 2026-06-02

<!-- changelog-from-git-history: v1.2.2..HEAD -->

### Features

- Released render.
`;

    expect(insertChangelogSection(existing, released)).toBe(existing);
  });

  it("inserts a versioned section for a new range above existing releases", () => {
    const existing = `# Changelog

## 1.2.2 - 2026-05-01

<!-- changelog-from-git-history: v1.2.1..v1.2.2 -->

- Previous.
`;
    const generated = `## 1.2.3 - 2026-06-01

<!-- changelog-from-git-history: v1.2.2..HEAD -->

### Features

- Added export.
`;

    expect(insertChangelogSection(existing, generated)).toBe(`# Changelog

${generated}
## 1.2.2 - 2026-05-01

<!-- changelog-from-git-history: v1.2.1..v1.2.2 -->

- Previous.
`);
  });
});
