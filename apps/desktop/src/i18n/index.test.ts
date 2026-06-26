import { describe, expect, it } from "vitest";

import { resolveTemplate } from "./index";

describe("i18n templates", () => {
	it("replaces single-brace placeholders", () => {
		expect(resolveTemplate("Select theme: {name}", { name: "Dark" })).toBe(
			"Select theme: Dark",
		);
	});

	it("keeps double-brace placeholders and literal replacement values working", () => {
		expect(
			resolveTemplate("{{ name }} recorded {count} clips", {
				count: 2,
				name: "$&",
			}),
		).toBe("$& recorded 2 clips");
	});
});
