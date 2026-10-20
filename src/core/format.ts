export const OUTPUT_FORMATS = ["markdown", "json", "release-notes"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function outputFormatList(): string {
  const last = OUTPUT_FORMATS[OUTPUT_FORMATS.length - 1];
  return `${OUTPUT_FORMATS.slice(0, -1).join(", ")}, or ${last}`;
}
