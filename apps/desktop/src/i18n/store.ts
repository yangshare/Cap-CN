import { declareStore } from "~/store";

import type { Locale } from "./index.js";

export type I18nSettings = { language?: Locale };

export const i18nSettingsStore = declareStore<I18nSettings>("i18n");
