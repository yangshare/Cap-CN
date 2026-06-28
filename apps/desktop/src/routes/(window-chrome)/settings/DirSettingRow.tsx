import { Button } from "@cap/ui-solid";
import { open } from "@tauri-apps/plugin-dialog";
import { createMemo, Show } from "solid-js";
import { generalSettingsStore } from "~/store";
import { commands } from "~/utils/tauri";
import { useI18n } from "~/i18n/I18nProvider";
import { SectionRows, SettingItem } from "./Setting";

type DirKind = "recordings" | "screenshots";

export function DirSettingRow(props: { kind: DirKind; disabled?: boolean }) {
	const { t } = useI18n();
	const settings = generalSettingsStore.createQuery();

	const customDirKey = createMemo(() =>
		props.kind === "recordings" ? "customRecordingsDir" : "customScreenshotsDir",
	);

	const setDirCommand = createMemo(() =>
		props.kind === "recordings"
			? commands.setRecordingsDir
			: commands.setScreenshotsDir,
	);

	const titleKey = createMemo(() =>
		props.kind === "recordings"
			? "settings.storage.recordingsTitle"
			: "settings.storage.screenshotsTitle",
	);

	const descKey = createMemo(() =>
		props.kind === "recordings"
			? "settings.storage.recordingsDesc"
			: "settings.storage.screenshotsDesc",
	);

	const currentPath = createMemo(() => {
		const data = settings.data;
		if (!data) return null;
		const key = customDirKey();
		return (data as Record<string, string | null | undefined>)[key] ?? null;
	});

	const isDefault = createMemo(() => currentPath() === null);

	const handleChange = async () => {
		const selected = await open({ directory: true, multiple: false });
		if (!selected) return;
		const path = typeof selected === "string" ? selected : selected;
		try {
			await setDirCommand()(path);
		} catch (e) {
			const msg = String(e);
			if (msg.includes("无法创建目录") || msg.includes("Cannot create directory")) {
				alert(t("settings.storage.errorCreate", { error: msg }));
			} else if (msg.includes("目录不可写") || msg.includes("not writable")) {
				alert(t("settings.storage.errorWritable", { error: msg }));
			} else {
				alert(msg);
			}
		}
	};

	const handleReset = async () => {
		try {
			await setDirCommand()(null);
		} catch (e) {
			alert(String(e));
		}
	};

	return (
		<SectionRows>
			<SettingItem
				label={t(titleKey())}
				description={t(descKey())}
			>
				<div class="flex items-center gap-2">
					<Show when={isDefault()}>
						<span class="text-xs text-gray-10 truncate max-w-[120px]">
							{t("settings.storage.defaultLabel")}
						</span>
					</Show>
					<Show when={!isDefault()}>
						<span
							class="text-xs text-gray-11 truncate max-w-[120px]"
							title={currentPath() ?? ""}
						>
							{currentPath()}
						</span>
					</Show>
					<Button
						variant="gray"
						size="sm"
						class="h-[28px] px-2 text-xs"
						onClick={handleChange}
						disabled={props.disabled}
					>
						{t("settings.storage.change")}
					</Button>
					<Button
						variant="gray"
						size="sm"
						class="h-[28px] px-2 text-xs"
						onClick={handleReset}
						disabled={props.disabled || isDefault()}
					>
						{t("settings.storage.resetDefault")}
					</Button>
				</div>
			</SettingItem>
			<Show when={props.disabled}>
				<div class="px-4 py-2 text-xs text-amber-6 bg-amber-2 border-t border-amber-3">
					{t("settings.storage.lockedHint")}
				</div>
			</Show>
		</SectionRows>
	);
}
