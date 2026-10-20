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
  releaseVersion?: string;
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
      case "-v": {
        const next = argv[index + 1];
        if (next && !next.startsWith("-")) {
          if (options.version) {
            throw new Error("Use either --version or --version <version>, not both.");
          }
          options.releaseVersion = next;
          index += 1;
        } else if (options.releaseVersion) {
          throw new Error("Use either --version or --version <version>, not both.");
        } else {
          options.version = true;
        }
        break;
      }
      default:
        throw new Error(`Unknown option "${arg}".`);
    }
  }

  if (options.since && options.range) {
    throw new Error("Use either --since or --range, not both.");
  }

  return options;
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
  --github                   Try to enrich output with GitHub PR metadata
  --dry-run                  Preview output without writing files
  --help, -h                 Show help
  --version, -v [version]    Show the CLI version, or set the release heading
`;
}
