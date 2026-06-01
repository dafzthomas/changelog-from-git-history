import type { ChangelogData } from "../core/aggregate.js";

export function renderJson(data: ChangelogData): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
