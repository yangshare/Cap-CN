import { describe, expect, it } from "vitest";

import { createSettingsNavItems } from "./settings-nav";

describe("settings navigation", () => {
	it("keeps labels reactive when translations change", () => {
		let language = "en";
		const items = createSettingsNavItems((key) => `${language}:${key}`);

		expect(items[0]?.name()).toBe("en:settings.nav.general");

		language = "zh";

		expect(items[0]?.name()).toBe("zh:settings.nav.general");
	});
});
