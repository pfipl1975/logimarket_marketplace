const polishCharacters: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function normalizeCategorySlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (character) => polishCharacters[character] ?? character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLocalizedCategoryLabel(
  labelsBySlug: Record<string, string>,
  categorySlug: string,
  fallbackLabel: string,
): string {
  const normalizedSlug = normalizeCategorySlug(categorySlug);
  const directLabel = labelsBySlug[normalizedSlug];

  if (directLabel) {
    return directLabel;
  }

  const matchingEntry = Object.entries(labelsBySlug).find(
    ([key]) => normalizeCategorySlug(key) === normalizedSlug,
  );

  if (matchingEntry) {
    return matchingEntry[1];
  }

  const normalizedFallbackLabel = normalizeCategorySlug(fallbackLabel);
  const fallbackMatchingEntry = Object.entries(labelsBySlug).find(
    ([key]) => normalizeCategorySlug(key) === normalizedFallbackLabel,
  );

  return fallbackMatchingEntry?.[1] ?? fallbackLabel;
}