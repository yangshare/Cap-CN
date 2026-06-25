import * as i18n from "@solid-primitives/i18n";
import {
	createContext,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	type ParentProps,
	useContext,
	type Accessor,
} from "solid-js";

import { detectLocale, fetchDictionary, type Locale } from "./index.js";
import { i18nSettingsStore } from "./store.js";

type TranslateFn = (
	path: string,
	variables?: Record<string, string | number>,
) => string;

type I18nContextValue = {
	locale: Accessor<Locale>;
	setLocale: (locale: Locale) => void;
	t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue>();

/**
 * Provides a reactive translator and locale to the whole app.
 *
 * The locale is seeded synchronously from `detectLocale()` (so there is no
 * flash of the wrong language on first paint), then reconciled with the
 * persisted value and kept in sync across windows via `i18nSettingsStore`.
 */
export function I18nProvider(props: ParentProps) {
	const [locale, setLocaleSignal] = createSignal<Locale>(detectLocale());

	const dict = createMemo(() => fetchDictionary(locale()));
	const translator = i18n.translator(dict, i18n.resolveTemplate);

	// `t` reads the current translator lazily, so call sites stay reactive to
	// locale changes without needing to unwrap an accessor themselves. The
	// translator is strongly typed to exact dictionary paths; we expose a
	// loose `string` API and assert back to `string` at the boundary.
	const t: TranslateFn = (path, variables) =>
		(translator as (path: string, variables?: Record<string, string>) => string)(
			path,
			variables
				? Object.fromEntries(
						Object.entries(variables).map(([key, value]) => [
							key,
							String(value),
						]),
					)
				: undefined,
		);

	const setLocale = (next: Locale) => {
		setLocaleSignal(next);
		void i18nSettingsStore.set({ language: next });
	};

	let disposed = false;
	let stopListening: (() => void) | undefined;

	onMount(() => {
		void i18nSettingsStore
			.get()
			.then((settings) => {
				if (!disposed && settings?.language) {
					setLocaleSignal(settings.language);
				}
			})
			.catch((error) => console.error("Failed to load i18n settings:", error));

		void i18nSettingsStore
			.listen((settings) => {
				if (disposed) return;
				const next = settings?.language;
				if (next && next !== locale()) setLocaleSignal(next);
			})
			.then((unlisten) => {
				if (disposed) {
					unlisten();
					return;
				}
				stopListening = unlisten;
			})
			.catch((error) => console.error("Failed to listen i18n settings:", error));
	});

	onCleanup(() => {
		disposed = true;
		stopListening?.();
	});

	return (
		<I18nContext.Provider value={{ locale, setLocale, t }}>
			{props.children}
		</I18nContext.Provider>
	);
}

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an <I18nProvider>");
	}
	return ctx;
}
