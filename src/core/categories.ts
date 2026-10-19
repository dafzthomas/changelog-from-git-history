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

export function parseCategoryName(name: string): ChangeCategory {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new Error("Expected a category name.");
  }

  if (!isChangeCategory(trimmed)) {
    throw new Error(
      `Unknown category "${trimmed}". Expected one of: ${CATEGORY_ORDER.join(", ")}.`
    );
  }

  return trimmed;
}

function isChangeCategory(value: string): value is ChangeCategory {
  return CATEGORY_ORDER.some((category) => category === value);
}
