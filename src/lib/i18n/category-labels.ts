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

export function resolveCategoryName({
  slug,
  dbName,
  localeBySlug,
  fallbackBySlug,
}: {
  slug: string;
  dbName: string;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}): string {
  const normalizedSlug = normalizeCategorySlug(slug);

  // 1. Try locale label
  if (localeBySlug) {
    const directLabel = localeBySlug[normalizedSlug];
    if (directLabel) return directLabel;

    const matchingEntry = Object.entries(localeBySlug).find(
      ([key]) => normalizeCategorySlug(key) === normalizedSlug,
    );
    if (matchingEntry) return matchingEntry[1];
  }

  // 2. Try fallback label (PL)
  if (fallbackBySlug) {
    const directLabel = fallbackBySlug[normalizedSlug];
    if (directLabel) return directLabel;

    const matchingEntry = Object.entries(fallbackBySlug).find(
      ([key]) => normalizeCategorySlug(key) === normalizedSlug,
    );
    if (matchingEntry) return matchingEntry[1];
  }

  // 3. Fallback to DB name
  return dbName;
}

export function resolveCategoryIntro({
  slug,
  localeIntrosBySlug,
  fallbackIntrosBySlug,
  fallbackIntro = "",
}: {
  slug: string;
  localeIntrosBySlug?: Record<string, string>;
  fallbackIntrosBySlug?: Record<string, string>;
  fallbackIntro?: string;
}): string {
  const normalizedSlug = normalizeCategorySlug(slug);

  // 1. Try locale intro
  if (localeIntrosBySlug) {
    const directIntro = localeIntrosBySlug[normalizedSlug];
    if (directIntro) return directIntro;

    const matchingEntry = Object.entries(localeIntrosBySlug).find(
      ([key]) => normalizeCategorySlug(key) === normalizedSlug,
    );
    if (matchingEntry) return matchingEntry[1];
  }

  // 2. Try fallback intro (PL)
  if (fallbackIntrosBySlug) {
    const directIntro = fallbackIntrosBySlug[normalizedSlug];
    if (directIntro) return directIntro;

    const matchingEntry = Object.entries(fallbackIntrosBySlug).find(
      ([key]) => normalizeCategorySlug(key) === normalizedSlug,
    );
    if (matchingEntry) return matchingEntry[1];
  }

  // 3. Return fallbackIntro
  return fallbackIntro;
}

export function getLocalizedCategoryLabel(
  labelsBySlug: Record<string, string> | undefined,
  categorySlug: string,
  fallbackLabel: string,
): string {
  return resolveCategoryName({
    slug: categorySlug,
    dbName: fallbackLabel,
    localeBySlug: labelsBySlug,
    fallbackBySlug: undefined,
  });
}