export type ChangeCategory =
  | "features"
  | "fixes"
  | "documentation"
  | "performance"
  | "refactors"
  | "tests"
  | "build"
  | "dependencies"
  | "maintenance"
  | "other";

export const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  features: "Features",
  fixes: "Fixes",
  documentation: "Documentation",
  performance: "Performance",
  refactors: "Refactors",
  tests: "Tests",
  build: "Build and CI",
  dependencies: "Dependencies",
  maintenance: "Maintenance",
  other: "Other"
};

export const CATEGORY_ORDER: ChangeCategory[] = [
  "features",
  "fixes",
  "documentation",
  "performance",
  "refactors",
  "tests",
  "build",
  "dependencies",
  "maintenance",
  "other"
];
