import { describe, expect, it } from "vitest";

import { dirSettingQueryKey } from "./DirSettingRow";

describe("DirSettingRow", () => {
	it("maps directory kinds to the list queries that should refresh", () => {
		expect(dirSettingQueryKey("recordings")).toEqual(["recordings"]);
		expect(dirSettingQueryKey("screenshots")).toEqual(["screenshots"]);
	});
});
