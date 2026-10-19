import { CATEGORY_ORDER, parseCategoryName, type ChangeCategory } from "../core/categories.js";

export type OutputFormat = "markdown" | "json";

export type CliOptions = {
  since?: string;
  range?: string;
  output?: string;
  stdout: boolean;
  format: OutputFormat;
  github: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
  categories?: ReadonlySet<ChangeCategory>;
};

const FORMATS = new Set<OutputFormat>(["markdown", "json"]);

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    stdout: false,
    format: "markdown",
    github: false,
    dryRun: false,
    help: false,
    version: false
  };
  let includeSeen = false;
  let excludeSeen = false;
  const included = new Set<ChangeCategory>();
  const excluded = new Set<ChangeCategory>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--since":
        options.since = readValue(argv, ++index, "--since");
        break;
      case "--range":
        options.range = readValue(argv, ++index, "--range");
        break;
      case "--output":
      case "-o":
        options.output = readValue(argv, ++index, arg);
        break;
      case "--stdout":
        options.stdout = true;
        break;
      case "--format": {
        const format = readValue(argv, ++index, "--format");
        if (!FORMATS.has(format as OutputFormat)) {
          throw new Error(`Unsupported format "${format}". Expected markdown or json.`);
        }
        options.format = format as OutputFormat;
        break;
      }
      case "--include": {
        includeSeen = true;
        for (const category of readCategories(readValue(argv, ++index, "--include"))) {
          included.add(category);
        }
        break;
      }
      case "--exclude": {
        excludeSeen = true;
        for (const category of readCategories(readValue(argv, ++index, "--exclude"))) {
          excluded.add(category);
        }
        break;
      }
      case "--github":
        options.github = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      default:
        throw new Error(`Unknown option "${arg}".`);
    }
  }

  if (options.since && options.range) {
    throw new Error("Use either --since or --range, not both.");
  }

  if (includeSeen || excludeSeen) {
    const categories = new Set<ChangeCategory>();
    for (const category of CATEGORY_ORDER) {
      if ((!includeSeen || included.has(category)) && !excluded.has(category)) {
        categories.add(category);
      }
    }
    options.categories = categories;
  }

  return options;
}

function readCategories(value: string): ChangeCategory[] {
  return value.split(",").map((segment) => parseCategoryName(segment));
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${flag}.`);
  }
  return value;
}

export function helpText(): string {
  return `Usage: changelog-from-git-history [options]

Generate a changelog from the current Git repository.

Options:
  --since <ref>              Generate from ref to HEAD
  --range <from..to>         Generate for an explicit Git revision range
  --output, -o <file>        Write or update a changelog file
  --stdout                   Print only the generated output
  --format <markdown|json>   Output format (default: markdown)
  --include <categories>     Keep only these categories, comma-separated
  --exclude <categories>     Drop these categories, comma-separated
  --github                   Try to enrich output with GitHub PR metadata
  --dry-run                  Preview output without writing files
  --help, -h                 Show help
  --version, -v              Show version
`;
}
