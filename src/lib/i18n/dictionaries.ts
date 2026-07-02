import "server-only";

import type { Dictionary, Locale } from "./types";

const loadPolishDictionary = () => import("@/messages/pl.json").then((module) => module.default);
const loadEnglishDictionary = () => import("@/messages/en.json").then((module) => module.default);

const dictionaries: Partial<Record<Locale, () => Promise<Dictionary>>> = {
  pl: loadPolishDictionary,
  en: loadEnglishDictionary,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]?.() ?? loadPolishDictionary();
}
