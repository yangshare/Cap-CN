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

export function fetchDictionary(locale: Locale): Dictionary {
	return i18n.flatten(dictionaries[locale]);
}

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function resolveTemplate(
	source: string,
	variables?: Record<string, string | number>,
): string {
	if (!variables) return source;

	let result = source;
	for (const [key, value] of Object.entries(variables)) {
		const escapedKey = escapeRegExp(key);
		const replacement = String(value);
		result = result
			.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g"), () => replacement)
			.replace(new RegExp(`{\\s*${escapedKey}\\s*}`, "g"), () => replacement);
	}
	return result;
}

export const SUPPORTED_LOCALES: { value: Locale; text: string }[] = [
	{ value: "zh", text: "简体中文" },
	{ value: "en", text: "English" },
];

export function detectLocale(): Locale {
	const nav = typeof navigator !== "undefined" ? navigator.language : undefined;
	return nav?.toLowerCase().startsWith("zh") ? "zh" : "en";
}
