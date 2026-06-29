import "server-only";

import type { Dictionary, Locale } from "./types";

const loadPolishDictionary = () => import("@/messages/pl.json").then((module) => module.default);

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  pl: loadPolishDictionary,
  en: loadPolishDictionary,
  de: loadPolishDictionary,
  fr: loadPolishDictionary,
  uk: loadPolishDictionary,
  es: loadPolishDictionary,
  zh: loadPolishDictionary,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]?.() ?? dictionaries.pl();
}
