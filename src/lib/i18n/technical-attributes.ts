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

export function normalizeTechnicalAttributeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (character) => polishCharacters[character] ?? character)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLocalizedTechnicalAttributeLabel(
  labelsByKey: Record<string, string>,
  attributeLabel: string,
): string {
  return labelsByKey[normalizeTechnicalAttributeKey(attributeLabel)] ?? attributeLabel;
}
