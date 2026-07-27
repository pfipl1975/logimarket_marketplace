export function extractLikeLiteralTerms(matchQuery: string): string[] {
  const terms: string[] = [];

  for (const rawPart of matchQuery.split(/\s+/u)) {
    const part = rawPart.replace(/^[^\p{L}\p{N}%_\\]+|[^\p{L}\p{N}%_\\]+$/gu, "");
    if (part.length > 0 && /[%_\\]/u.test(part) && !terms.includes(part)) {
      terms.push(part);
    }
  }

  return terms;
}

export function normalizeCatalogSearchQuery(
  rawQuery: string,
  locale: string,
): { query: string; matchQuery: string; tokens: string[]; literalTerms: string[] } {
  // 1. Unicode NFC
  const normalized = rawQuery.normalize("NFC");

  // 2. Trim and collapse repeated Unicode whitespace
  // \s matches any whitespace character (spaces, tabs, line breaks)
  // We use replace to collapse multiple whitespaces into a single space, then trim.
  const query = normalized.replace(/\s+/gu, " ").trim();

  // 3. locale-aware lowercase for matching
  const matchQuery = query.toLocaleLowerCase(locale);

  // 4. Tokenization: words and numbers, keeping all languages
  // \p{L} = letters from any language
  // \p{N} = numbers from any script
  const rawTokens = matchQuery.match(/[\p{L}\p{N}]+/gu) || [];

  // 5. Deduplicate preserving order
  const uniqueTokens: string[] = [];
  for (const token of rawTokens) {
    if (!uniqueTokens.includes(token)) {
      uniqueTokens.push(token);
    }
  }

  // We do not slice here; parser handles max tokens check.
  const tokens = uniqueTokens;

  const literalTerms = extractLikeLiteralTerms(matchQuery);

  return {
    query,
    matchQuery,
    tokens,
    literalTerms,
  };
}
