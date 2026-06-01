export function isSemverLikeTag(tagName: string): boolean {
  return /^v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(tagName);
}

export function pickLatestSemverTag(tagNames: string[]): string | null {
  return tagNames.find((tagName) => isSemverLikeTag(tagName)) ?? null;
}
