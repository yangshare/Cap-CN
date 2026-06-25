import { declareStore } from "~/store";

import type { Locale } from "./index.js";

export type I18nSettings = { language?: Locale };

/**
 * Persisted interface language. Backed by the same Tauri store plugin as the
 * other settings, so it is shared across every Cap window and changes in one
 * window are observed live in the others.
 */
export const i18nSettingsStore = declareStore<I18nSettings>("i18n");
