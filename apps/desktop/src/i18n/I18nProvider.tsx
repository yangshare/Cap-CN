import * as i18n from "@solid-primitives/i18n";
import {
	type Accessor,
	createContext,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	type ParentProps,
	useContext,
} from "solid-js";

import {
	detectLocale,
	fetchDictionary,
	type Locale,
	resolveTemplate,
} from "./index.js";
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

export function I18nProvider(props: ParentProps) {
	const [locale, setLocaleSignal] = createSignal<Locale>(detectLocale());

	const dict = createMemo(() => fetchDictionary(locale()));
	const translator = i18n.translator(dict, resolveTemplate);

	const t: TranslateFn = (path, variables) =>
		(
			translator as (
				path: string,
				variables?: Record<string, string | number>,
			) => string
		)(path, variables);

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
			.catch((error) =>
				console.error("Failed to listen i18n settings:", error),
			);
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
