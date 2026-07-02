export function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function getLocalizedCategoryLabel(
  labelsBySlug: Record<string, string>,
  categorySlug: string,
  fallbackLabel: string,
): string {
  return labelsBySlug[normalizeCategorySlug(categorySlug)] ?? fallbackLabel;
}
