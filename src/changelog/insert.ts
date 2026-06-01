const CHANGELOG_HEADING = "# Changelog";

export function insertChangelogSection(existing: string, generatedSection: string): string {
  if (existing.includes(generatedSection)) {
    return existing;
  }

  const marker = findGeneratedRangeMarker(generatedSection);
  if (marker && existing.includes(marker)) {
    return existing;
  }

  if (existing.trim().length === 0) {
    return `${CHANGELOG_HEADING}\n\n${generatedSection}`;
  }

  const changelogHeadingMatch = existing.match(/^# Changelog(\r?\n|$)/);
  if (changelogHeadingMatch) {
    const remainingContent = existing.slice(changelogHeadingMatch[0].length);
    return `${CHANGELOG_HEADING}\n\n${generatedSection}${remainingContent}`;
  }

  return `${generatedSection}\n${existing}`;
}

function findGeneratedRangeMarker(section: string): string | null {
  return section.match(/<!--\s*changelog-from-git-history:\s*[^>]+?-->/)?.[0] ?? null;
}
