import "server-only";

import type { Dictionary, Locale } from "./types";

const loadPolishDictionary = () => import("@/messages/pl.json").then((module) => module.default);
const loadEnglishDictionary = () => import("@/messages/en.json").then((module) => module.default);
const loadGermanDictionary = () => import("@/messages/de.json").then((module) => module.default);
const loadFrenchDictionary = () => import("@/messages/fr.json").then((module) => module.default);
const loadSpanishDictionary = () => import("@/messages/es.json").then((module) => module.default);
const loadUkrainianDictionary = () => import("@/messages/uk.json").then((module) => module.default);
const loadChineseDictionary = () => import("@/messages/zh.json").then((module) => module.default);

const dictionaries: Partial<Record<Locale, () => Promise<Dictionary>>> = {
  pl: loadPolishDictionary,
  en: loadEnglishDictionary,
  de: loadGermanDictionary,
  fr: loadFrenchDictionary,
  es: loadSpanishDictionary,
  uk: loadUkrainianDictionary,
  zh: loadChineseDictionary,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]?.() ?? loadPolishDictionary();
}
