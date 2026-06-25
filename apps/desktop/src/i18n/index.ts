import * as i18n from "@solid-primitives/i18n";

import { dict as en } from "./locales/en.js";
import { dict as zh } from "./locales/zh.js";

export type Locale = "en" | "zh";

export type RawDictionary = typeof en;
export type Dictionary = i18n.Flatten<RawDictionary>;

const dictionaries: Record<Locale, RawDictionary> = {
	en,
	zh,
};

/** Synchronously resolve a flattened dictionary for the given locale. */
export function fetchDictionary(locale: Locale): Dictionary {
	return i18n.flatten(dictionaries[locale]);
}

export const SUPPORTED_LOCALES: { value: Locale; text: string }[] = [
	{ value: "zh", text: "简体中文" },
	{ value: "en", text: "English" },
];

/** Synchronous best-guess default locale from the environment. */
export function detectLocale(): Locale {
	const nav =
		typeof navigator !== "undefined" ? navigator.language : undefined;
	return nav?.toLowerCase().startsWith("zh") ? "zh" : "en";
}
