import { Button } from "@cap/ui-solid";
import { createWritableMemo } from "@solid-primitives/memo";
import {
	isPermissionGranted,
	requestPermission,
} from "@tauri-apps/plugin-notification";
import { type OsType, type } from "@tauri-apps/plugin-os";
import "@total-typescript/ts-reset/filter-boolean";
import { Collapsible } from "@kobalte/core/collapsible";
import { CheckMenuItem, Menu, MenuItem } from "@tauri-apps/api/menu";
import { confirm } from "@tauri-apps/plugin-dialog";
import { cx } from "cva";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import toast from "solid-toast";
import themePreviewAuto from "~/assets/theme-previews/auto.jpg";
import themePreviewDark from "~/assets/theme-previews/dark.jpg";
import themePreviewLight from "~/assets/theme-previews/light.jpg";
import { SUPPORTED_LOCALES } from "~/i18n";
import { useI18n } from "~/i18n/I18nProvider";
import { Input } from "~/routes/editor/ui";
import { authStore, generalSettingsStore } from "~/store";
import { clientEnv } from "~/utils/env";
import {
	deriveGeneralSettings,
	type GeneralSettingsStore,
} from "~/utils/general-settings";
import {
	type AppTheme,
	type CaptureWindow,
	commands,
	events,
	type MainWindowRecordingStartBehaviour,
	type PostDeletionBehaviour,
	type PostStudioRecordingBehaviour,
	type StudioRecordingQuality,
	type WindowExclusion,
} from "~/utils/tauri";
import IconLucideAlertTriangle from "~icons/lucide/alert-triangle";
import IconLucidePlus from "~icons/lucide/plus";
import IconLucideX from "~icons/lucide/x";
import {
	Section,
	SectionCard,
	SectionRows,
	SettingItem,
	SettingsPageContent,
	ToggleSettingItem,
} from "./Setting";

const getExclusionPrimaryLabel = (entry: WindowExclusion) =>
	entry.ownerName ?? entry.windowTitle ?? entry.bundleIdentifier ?? "Unknown";

const getExclusionSecondaryLabel = (entry: WindowExclusion) => {
	if (entry.ownerName && entry.windowTitle) {
		return entry.windowTitle;
	}

	if (entry.bundleIdentifier && (entry.ownerName || entry.windowTitle)) {
		return entry.bundleIdentifier;
	}

	return entry.bundleIdentifier ?? null;
};

const getWindowOptionLabel = (window: CaptureWindow) => {
	const parts = [window.owner_name];
	if (window.name && window.name !== window.owner_name) {
		parts.push(window.name);
	}
	return parts.join(" • ");
};

const isSameExclusion = (a: WindowExclusion, b: WindowExclusion) =>
	(a.bundleIdentifier ?? null) === (b.bundleIdentifier ?? null) &&
	(a.ownerName ?? null) === (b.ownerName ?? null) &&
	(a.windowTitle ?? null) === (b.windowTitle ?? null);

const coversDefaultExclusion = (
	entry: WindowExclusion,
	defaultEntry: WindowExclusion,
) => {
	if (isSameExclusion(entry, defaultEntry)) return true;
	if (
		defaultEntry.windowTitle &&
		entry.windowTitle === defaultEntry.windowTitle
	) {
		return true;
	}
	if (
		defaultEntry.bundleIdentifier &&
		entry.bundleIdentifier === defaultEntry.bundleIdentifier
	) {
		return true;
	}
	if (defaultEntry.ownerName && entry.ownerName === defaultEntry.ownerName) {
		return !entry.windowTitle || entry.windowTitle === defaultEntry.windowTitle;
	}
	return false;
};

type ExtendedGeneralSettingsStore = GeneralSettingsStore;

const MAX_FPS_OPTIONS = [
	{ value: 30, labelKey: "recording.maxFps.options.fps30" },
	{ value: 60, labelKey: "recording.maxFps.options.fps60" },
	{ value: 120, labelKey: "recording.maxFps.options.fps120" },
] satisfies {
	value: number;
	labelKey: string;
}[];

const DEFAULT_PROJECT_NAME_TEMPLATE =
	"{target_name} ({target_kind}) {date} {time}";
const FREE_INSTANT_MODE_MAX_RESOLUTION = 1280;
const PRO_INSTANT_MODE_MAX_RESOLUTION = 1920;

export default function GeneralSettings() {
	const [store] = createResource(() => generalSettingsStore.get());

	return (
		<Show when={store.state === "ready" && ([store()] as const)}>
			{(store) => <Inner initialStore={store()[0] ?? null} />}
		</Show>
	);
}

function AppearanceSection(props: {
	currentTheme: AppTheme;
	onThemeChange: (theme: AppTheme) => void;
}) {
	const { t } = useI18n();
	const options = [
		{ id: "system", name: t("appearance.theme.system") },
		{ id: "light", name: t("appearance.theme.light") },
		{ id: "dark", name: t("appearance.theme.dark") },
	] satisfies { id: AppTheme; name: string }[];

	const previews = {
		system: themePreviewAuto,
		light: themePreviewLight,
		dark: themePreviewDark,
	};

	return (
		<Section title={t("appearance.title")} description={t("appearance.desc")}>
			<SectionCard padded>
				<div
					class="grid grid-cols-3 gap-3"
					onContextMenu={(e) => e.preventDefault()}
				>
					<For each={options}>
						{(theme) => {
							const isSelected = () => props.currentTheme === theme.id;
							return (
								<button
									type="button"
									aria-checked={isSelected()}
									aria-label={t("appearance.selectTheme", {
										name: theme.name,
									})}
									onClick={() => props.onThemeChange(theme.id)}
									class="flex flex-col gap-2 items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-9 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-1 rounded-xl"
								>
									<div
										class={cx(
											"w-full aspect-[5/3] rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow] duration-150",
											isSelected()
												? "border-blue-9"
												: "border-gray-4 group-hover:border-gray-6",
										)}
									>
										<Show when={previews[theme.id]} keyed>
											{(preview) => (
												<img
													class="object-cover w-full h-full animate-in fade-in duration-200"
													draggable={false}
													src={preview}
													alt={t("appearance.previewTheme", {
														name: theme.name,
													})}
												/>
											)}
										</Show>
									</div>
									<span
										class={cx(
											"text-xs font-medium transition-colors",
											isSelected() ? "text-gray-12" : "text-gray-10",
										)}
									>
										{theme.name}
									</span>
								</button>
							);
						}}
					</For>
				</div>
			</SectionCard>
		</Section>
	);
}

function Inner(props: { initialStore: GeneralSettingsStore | null }) {
	const [settings, setSettings] = createStore<ExtendedGeneralSettingsStore>(
		deriveGeneralSettings(props.initialStore),
	);
	const auth = authStore.createQuery();
	const { t, locale, setLocale } = useI18n();
	const hasCapPro = createMemo(() => {
		const plan = auth.data?.plan;
		return !!plan && (plan.upgraded || plan.manual);
	});
	const instantModeMaxResolution = createMemo(() =>
		hasCapPro()
			? (settings.instantModeMaxResolution ?? PRO_INSTANT_MODE_MAX_RESOLUTION)
			: FREE_INSTANT_MODE_MAX_RESOLUTION,
	);

	createEffect(() => {
		setSettings(reconcile(deriveGeneralSettings(props.initialStore)));
	});

	let scrollContainerRef: HTMLDivElement | undefined;

	const scrollToSection = (section: string) => {
		try {
			localStorage.removeItem("cap.settings.scrollToSection");
		} catch {}
		const attempt = (remaining: number) => {
			const target = document.getElementById(`settings-section-${section}`);
			const container = scrollContainerRef;
			if (!target || !container) {
				if (remaining > 0) {
					window.setTimeout(() => attempt(remaining - 1), 50);
				}
				return;
			}
			const containerRect = container.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();
			const offset =
				targetRect.top - containerRect.top + container.scrollTop - 8;
			container.scrollTo({ top: offset, behavior: "smooth" });
			target.classList.add("settings-section-pulse");
			window.setTimeout(() => {
				target.classList.remove("settings-section-pulse");
			}, 1600);
		};
		attempt(10);
	};

	onMount(() => {
		commands
			.updateAuthPlan()
			.then(() => auth.refetch())
			.catch(console.error);

		let pending: string | null = null;
		try {
			pending = localStorage.getItem("cap.settings.scrollToSection");
		} catch {}
		if (pending) {
			scrollToSection(pending);
		}

		const unlisten = events.requestScrollToSettingsSection.listen((event) => {
			scrollToSection(event.payload.section);
		});
		onCleanup(() => {
			unlisten.then((cb) => cb()).catch(() => {});
		});
	});

	const [windows, { refetch: refetchWindows }] = createResource(
		async () => {
			// Fetch windows with a small delay to avoid blocking initial render
			await new Promise((resolve) => setTimeout(resolve, 100));
			return commands.listCaptureWindows();
		},
		{
			initialValue: [] as CaptureWindow[],
		},
	);
	const [defaultExcludedWindows] = createResource(
		() => commands.getDefaultExcludedWindows(),
		{
			initialValue: [] as WindowExclusion[],
		},
	);

	const handleChange = async <K extends keyof typeof settings>(
		key: K,
		value: (typeof settings)[K],
		extra?: Partial<GeneralSettingsStore>,
	) => {
		console.log(`Handling settings change for ${key}: ${value}`);

		const previousValue = settings[key];
		setSettings(key as keyof GeneralSettingsStore, value);
		try {
			await generalSettingsStore.set({ [key]: value, ...(extra ?? {}) });
		} catch (error) {
			setSettings(key as keyof GeneralSettingsStore, previousValue);
			console.error(`Failed to update ${key}`, error);
		}
	};

	const ostype: OsType = type();
	const excludedWindows = createMemo(() => settings.excludedWindows ?? []);
	const missingDefaultExclusions = createMemo(() =>
		defaultExcludedWindows().filter(
			(defaultEntry) =>
				!excludedWindows().some((entry) =>
					coversDefaultExclusion(entry, defaultEntry),
				),
		),
	);

	const matchesExclusion = (
		exclusion: WindowExclusion,
		window: CaptureWindow,
	) => {
		const bundleMatch = exclusion.bundleIdentifier
			? window.bundle_identifier === exclusion.bundleIdentifier
			: false;
		if (bundleMatch) return true;

		const ownerMatch = exclusion.ownerName
			? window.owner_name === exclusion.ownerName
			: false;

		if (exclusion.ownerName && exclusion.windowTitle) {
			return ownerMatch && window.name === exclusion.windowTitle;
		}

		if (ownerMatch && exclusion.ownerName) {
			return true;
		}

		if (exclusion.windowTitle) {
			return window.name === exclusion.windowTitle;
		}

		return false;
	};

	const isManagedWindowsApp = (window: CaptureWindow) => {
		const bundle = window.bundle_identifier?.toLowerCase() ?? "";
		if (bundle.includes("so.cap.desktop")) {
			return true;
		}
		return window.owner_name.toLowerCase().includes("cap");
	};

	const isWindowAvailable = (window: CaptureWindow) => {
		if (excludedWindows().some((entry) => matchesExclusion(entry, window))) {
			return false;
		}
		if (ostype === "windows") {
			return isManagedWindowsApp(window);
		}
		return true;
	};

	const availableWindows = createMemo(() => {
		const data = windows() ?? [];
		return data.filter(isWindowAvailable);
	});

	const refreshAvailableWindows = async (): Promise<CaptureWindow[]> => {
		try {
			const refreshed = (await refetchWindows()) ?? windows() ?? [];
			return refreshed.filter(isWindowAvailable);
		} catch (error) {
			console.error("Failed to refresh available windows", error);
			return availableWindows();
		}
	};

	const applyExcludedWindows = async (windows: WindowExclusion[]) => {
		setSettings("excludedWindows", windows);
		try {
			await generalSettingsStore.set({ excludedWindows: windows });
			await commands.refreshWindowContentProtection();
			if (ostype === "macos") {
				await events.requestScreenCapturePrewarm.emit({ force: true });
			}
		} catch (error) {
			console.error("Failed to update excluded windows", error);
		}
	};

	const handleRemoveExclusion = async (index: number) => {
		const current = [...excludedWindows()];
		current.splice(index, 1);
		await applyExcludedWindows(current);
	};

	const handleAddWindow = async (window: CaptureWindow) => {
		const windowTitle = window.bundle_identifier ? null : window.name;

		const next = [
			...excludedWindows(),
			{
				bundleIdentifier: window.bundle_identifier ?? null,
				ownerName: window.owner_name ?? null,
				windowTitle,
			},
		];
		await applyExcludedWindows(next);
	};

	const handleResetExclusions = async () => {
		const defaults = await commands.getDefaultExcludedWindows();
		await applyExcludedWindows(defaults);
	};

	// Helper function to render select dropdown for recording behaviors
	const SelectSettingItem = <
		T extends
			| MainWindowRecordingStartBehaviour
			| PostStudioRecordingBehaviour
			| PostDeletionBehaviour
			| StudioRecordingQuality
			| number
			| string,
	>(props: {
		label: string;
		description: string;
		value: T;
		onChange: (value: T) => void;
		options: { text: string; value: T }[];
	}) => {
		return (
			<SettingItem label={props.label} description={props.description}>
				<button
					type="button"
					class="flex flex-row gap-1.5 text-xs items-center px-2.5 py-1.5 rounded-lg border transition-colors bg-gray-3 hover:bg-gray-4 text-gray-12 border-gray-4"
					onClick={async () => {
						const currentValue = props.value;
						const items = props.options.map((option) =>
							CheckMenuItem.new({
								text: option.text,
								checked: currentValue === option.value,
								action: () => props.onChange(option.value),
							}),
						);
						const menu = await Menu.new({
							items: await Promise.all(items),
						});
						await menu.popup();
						await menu.close();
					}}
				>
					{(() => {
						const currentValue = props.value;
						const option = props.options.find(
							(opt) => opt.value === currentValue,
						);
						return option ? option.text : currentValue;
					})()}
					<IconCapChevronDown class="size-3.5 text-gray-10" />
				</button>
			</SettingItem>
		);
	};

	return (
		<div
			ref={scrollContainerRef}
			class="cap-settings-page flex flex-col h-full custom-scroll"
		>
			<SettingsPageContent>
				<AppearanceSection
					currentTheme={settings.theme ?? "system"}
					onThemeChange={(newTheme) => {
						setSettings("theme", newTheme);
						generalSettingsStore.set({ theme: newTheme });
					}}
				/>

				<Section
					title={t("settings.language.sectionTitle")}
					description={t("settings.language.sectionDesc")}
				>
					<SectionRows>
						<SelectSettingItem
							label={t("settings.language.label")}
							description={t("settings.language.desc")}
							value={locale()}
							onChange={(value) => setLocale(value)}
							options={SUPPORTED_LOCALES}
						/>
					</SectionRows>
				</Section>

				{ostype === "macos" && (
					<Section title={t("app.title")} description={t("app.desc")}>
						<SectionRows>
							<ToggleSettingItem
								label={t("app.dockIcon.label")}
								description={t("app.dockIcon.desc")}
								value={!settings.hideDockIcon}
								onChange={(v) => handleChange("hideDockIcon", !v)}
							/>
							<ToggleSettingItem
								label={t("app.notifications.label")}
								description={t("app.notifications.desc")}
								value={!!settings.enableNotifications}
								onChange={async (value) => {
									if (value) {
										const permissionGranted = await isPermissionGranted();
										if (!permissionGranted) {
											const permission = await requestPermission();
											if (permission !== "granted") return;
										}
									}
									handleChange("enableNotifications", value);
								}}
							/>
						</SectionRows>
					</Section>
				)}

				<CapProSection
					hasCapPro={hasCapPro()}
					instantResolution={instantModeMaxResolution()}
					onInstantResolutionChange={(value) =>
						handleChange("instantModeMaxResolution", value)
					}
					autoOpenShareableLinks={!settings.disableAutoOpenLinks}
					onAutoOpenShareableLinksChange={(v) =>
						handleChange("disableAutoOpenLinks", !v)
					}
				/>

				<QualitySection
					studioQuality={settings.studioRecordingQuality ?? "balanced"}
					onStudioQualityChange={(value) =>
						handleChange("studioRecordingQuality", value)
					}
				/>

				<Section title={t("recording.title")} description={t("recording.desc")}>
					<SectionRows>
						<SelectSettingItem
							label={t("recording.countdown.label")}
							description={t("recording.countdown.desc")}
							value={settings.recordingCountdown ?? 0}
							onChange={(value) => handleChange("recordingCountdown", value)}
							options={[
								{ text: t("recording.countdown.off"), value: 0 },
								{
									text: t("recording.countdown.seconds", { n: 3 }),
									value: 3,
								},
								{
									text: t("recording.countdown.seconds", { n: 5 }),
									value: 5,
								},
								{
									text: t("recording.countdown.seconds", { n: 10 }),
									value: 10,
								},
							]}
						/>
						<SelectSettingItem
							label={t("recording.mainWindowStart.label")}
							description={t("recording.mainWindowStart.desc")}
							value={settings.mainWindowRecordingStartBehaviour ?? "close"}
							onChange={(value) =>
								handleChange("mainWindowRecordingStartBehaviour", value)
							}
							options={[
								{ text: t("recording.mainWindowStart.close"), value: "close" },
								{
									text: t("recording.mainWindowStart.minimise"),
									value: "minimise",
								},
							]}
						/>
						<SelectSettingItem
							label={t("recording.postStudio.label")}
							description={t("recording.postStudio.desc")}
							value={settings.postStudioRecordingBehaviour ?? "openEditor"}
							onChange={(value) =>
								handleChange("postStudioRecordingBehaviour", value)
							}
							options={[
								{
									text: t("recording.postStudio.openEditor"),
									value: "openEditor",
								},
								{
									text: t("recording.postStudio.showOverlay"),
									value: "showOverlay",
								},
							]}
						/>
						<SelectSettingItem
							label={t("recording.postDeletion.label")}
							description={t("recording.postDeletion.desc")}
							value={settings.postDeletionBehaviour ?? "doNothing"}
							onChange={(value) => handleChange("postDeletionBehaviour", value)}
							options={[
								{
									text: t("recording.postDeletion.doNothing"),
									value: "doNothing",
								},
								{
									text: t("recording.postDeletion.reopen"),
									value: "reopenRecordingWindow",
								},
							]}
						/>
						<ToggleSettingItem
							label={t("recording.deleteInstant.label")}
							description={t("recording.deleteInstant.desc")}
							value={settings.deleteInstantRecordingsAfterUpload ?? false}
							onChange={(v) =>
								handleChange("deleteInstantRecordingsAfterUpload", v)
							}
						/>
						<ToggleSettingItem
							label={t("recording.crashRecovery.label")}
							description={t("recording.crashRecovery.desc")}
							value={settings.crashRecoveryRecording ?? true}
							onChange={(value) =>
								handleChange("crashRecoveryRecording", value)
							}
						/>
						<ToggleSettingItem
							label={t("recording.customCursor.label")}
							description={t("recording.customCursor.desc")}
							value={!!settings.custom_cursor_capture2}
							onChange={(value) =>
								handleChange("custom_cursor_capture2", value)
							}
						/>
						<ToggleSettingItem
							label={t("recording.autoZoom.label")}
							description={t("recording.autoZoom.desc")}
							value={!!settings.autoZoomOnClicks}
							onChange={(value) => handleChange("autoZoomOnClicks", value)}
						/>
						<ToggleSettingItem
							label={t("recording.captureKeyboard.label")}
							description={t("recording.captureKeyboard.desc")}
							value={!!settings.captureKeyboardEvents}
							onChange={(value) => handleChange("captureKeyboardEvents", value)}
						/>
						<SelectSettingItem
							label={t("recording.maxFps.label")}
							description={
								(settings.maxFps ?? 60) > 60
									? t("recording.maxFps.descHigh")
									: t("recording.maxFps.desc")
							}
							value={settings.maxFps ?? 60}
							onChange={(value) => handleChange("maxFps", value)}
							options={MAX_FPS_OPTIONS.map((option) => ({
								text: t(option.labelKey),
								value: option.value,
							}))}
						/>
					</SectionRows>
				</Section>

				<DefaultProjectNameCard
					onChange={(value) =>
						handleChange("defaultProjectNameTemplate", value)
					}
					value={settings.defaultProjectNameTemplate ?? null}
				/>

				<ExcludedWindowsCard
					excludedWindows={excludedWindows()}
					missingDefaultExclusions={missingDefaultExclusions()}
					availableWindows={availableWindows()}
					onRequestAvailableWindows={refreshAvailableWindows}
					onRemove={handleRemoveExclusion}
					onAdd={handleAddWindow}
					onReset={handleResetExclusions}
					isLoading={windows.loading}
					isWindows={ostype === "windows"}
				/>

				<ServerURLSetting
					value={settings.serverUrl ?? clientEnv.VITE_SERVER_URL}
					defaultValue={clientEnv.VITE_SERVER_URL}
					onChange={async (v) => {
						const url = new URL(v);
						const origin = url.origin;

						if (!(await confirm(t("serverUrl.confirm", { origin })))) return;

						await authStore.set(undefined);
						await commands.setServerUrl(origin);
						handleChange("serverUrl", origin);
					}}
				/>

				<TelemetryCard
					value={settings.enableTelemetry !== false}
					onChange={(v) => handleChange("enableTelemetry", v)}
				/>
			</SettingsPageContent>
		</div>
	);
}

function TelemetryCard(props: {
	value: boolean;
	onChange: (value: boolean) => void;
}) {
	const { t } = useI18n();
	return (
		<Section title={t("telemetry.title")}>
			<SectionRows>
				<ToggleSettingItem
					label={t("telemetry.label")}
					description={t("telemetry.desc")}
					value={props.value}
					onChange={props.onChange}
				/>
			</SectionRows>
		</Section>
	);
}

type StudioQualityTier = {
	value: StudioRecordingQuality;
	labelKey: string;
	summaryKey: string;
	bestForKey: string;
};

const STUDIO_QUALITY_TIERS: StudioQualityTier[] = [
	{
		value: "compatibility",
		labelKey: "quality.studioTiers.compatibility.label",
		summaryKey: "quality.studioTiers.compatibility.summary",
		bestForKey: "quality.studioTiers.compatibility.bestFor",
	},
	{
		value: "balanced",
		labelKey: "quality.studioTiers.balanced.label",
		summaryKey: "quality.studioTiers.balanced.summary",
		bestForKey: "quality.studioTiers.balanced.bestFor",
	},
	{
		value: "ultra",
		labelKey: "quality.studioTiers.ultra.label",
		summaryKey: "quality.studioTiers.ultra.summary",
		bestForKey: "quality.studioTiers.ultra.bestFor",
	},
];

type InstantResolutionTier = {
	value: number;
	label: string;
	summaryKey: string;
};

const INSTANT_RESOLUTION_TIERS: InstantResolutionTier[] = [
	{
		value: 1280,
		label: "720p",
		summaryKey: "quality.instant.resTiers.p720",
	},
	{
		value: 1920,
		label: "1080p",
		summaryKey: "quality.instant.resTiers.p1080",
	},
	{
		value: 2560,
		label: "1440p",
		summaryKey: "quality.instant.resTiers.p1440",
	},
	{
		value: 3840,
		label: "4K",
		summaryKey: "quality.instant.resTiers.p4k",
	},
];

function SegmentedControl<T extends string | number>(props: {
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: string }[];
}) {
	return (
		<div class="inline-flex p-0.5 rounded-lg border border-gray-3 bg-gray-3">
			<For each={props.options}>
				{(option) => {
					const isSelected = () => props.value === option.value;
					return (
						<button
							type="button"
							onClick={() => props.onChange(option.value)}
							class={cx(
								"px-3 py-1 text-xs font-medium rounded-md transition-[background-color,color,box-shadow]",
								isSelected()
									? "bg-gray-1 text-gray-12 shadow-sm"
									: "text-gray-10 hover:text-gray-12",
							)}
						>
							{option.label}
						</button>
					);
				}}
			</For>
		</div>
	);
}

function StudioQualitySubsection(props: {
	value: StudioRecordingQuality;
	onChange: (value: StudioRecordingQuality) => void;
}) {
	const { t } = useI18n();
	const currentTier = createMemo(
		() =>
			STUDIO_QUALITY_TIERS.find((tier) => tier.value === props.value) ??
			STUDIO_QUALITY_TIERS[1],
	);

	return (
		<div
			id="settings-section-studio-quality"
			class="flex flex-col gap-3 px-4 py-4"
		>
			<div class="flex justify-between items-start gap-4">
				<div class="flex flex-col gap-0.5 min-w-0">
					<p class="text-[13px] text-gray-12">{t("quality.studioMode")}</p>
					<p class="text-xs leading-snug text-gray-10">
						{t("quality.studioModeDesc")}
					</p>
				</div>
				<SegmentedControl
					value={props.value}
					onChange={props.onChange}
					options={STUDIO_QUALITY_TIERS.map((tier) => ({
						value: tier.value,
						label: t(tier.labelKey),
					}))}
				/>
			</div>
			<div class="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-gray-3">
				<p class="text-xs text-gray-12">{t(currentTier().summaryKey)}</p>
				<p class="text-[11px] text-gray-10 leading-snug">
					<span class="text-gray-11">{t("quality.bestFor")}</span>{" "}
					{t(currentTier().bestForKey)}
				</p>
			</div>
		</div>
	);
}

function InstantQualitySetting(props: {
	hasCapPro: boolean;
	value: number;
	onChange: (value: number) => void;
}) {
	const { t } = useI18n();
	const effectiveValue = createMemo(() =>
		props.hasCapPro ? props.value : FREE_INSTANT_MODE_MAX_RESOLUTION,
	);
	const currentTier = createMemo(
		() =>
			INSTANT_RESOLUTION_TIERS.find((t) => t.value === effectiveValue()) ??
			INSTANT_RESOLUTION_TIERS[0],
	);
	const handleResolutionClick = async (value: number) => {
		if (props.hasCapPro || value === FREE_INSTANT_MODE_MAX_RESOLUTION) {
			props.onChange(value);
			return;
		}

		toast.custom(
			(toastItem) => (
				<div class="flex gap-3 items-center px-4 py-3 rounded-xl border shadow-lg bg-gray-1 border-gray-4 text-gray-12">
					<p class="text-sm">{t("quality.instant.upgradeToast")}</p>
					<button
						type="button"
						class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors bg-blue-9 text-white hover:bg-blue-10"
						onClick={() => {
							toast.dismiss(toastItem.id);
							void commands.showWindow("Upgrade");
						}}
					>
						{t("quality.instant.upgrade")}
					</button>
				</div>
			),
			{ duration: 6000 },
		);
	};

	return (
		<SettingItem
			id="settings-section-instant-quality"
			label={t("quality.instant.label")}
			description={
				props.hasCapPro
					? t("quality.instant.descPro")
					: t("quality.instant.descFree")
			}
		>
			<div class="flex flex-col items-end gap-1.5">
				<div class="inline-flex p-0.5 rounded-lg border border-gray-3 bg-gray-3">
					<For each={INSTANT_RESOLUTION_TIERS}>
						{(tier) => {
							const isSelected = () => effectiveValue() === tier.value;
							return (
								<button
									type="button"
									onClick={() => void handleResolutionClick(tier.value)}
									class={cx(
										"px-3 py-1 text-xs font-medium rounded-md transition-[background-color,color,box-shadow]",
										isSelected()
											? "bg-gray-1 text-gray-12 shadow-sm"
											: "text-gray-10 hover:text-gray-12",
									)}
								>
									{tier.label}
								</button>
							);
						}}
					</For>
				</div>
				<p class="text-[11px] leading-snug text-right text-gray-10">
					{t(currentTier().summaryKey)}
				</p>
			</div>
		</SettingItem>
	);
}

function CapProSection(props: {
	hasCapPro: boolean;
	instantResolution: number;
	onInstantResolutionChange: (value: number) => void;
	autoOpenShareableLinks: boolean;
	onAutoOpenShareableLinksChange: (value: boolean) => void;
}) {
	const { t } = useI18n();
	return (
		<Section title={t("capPro.title")} description={t("capPro.desc")} pro>
			<SectionRows>
				<InstantQualitySetting
					hasCapPro={props.hasCapPro}
					value={props.instantResolution}
					onChange={props.onInstantResolutionChange}
				/>
				<ToggleSettingItem
					label={t("capPro.autoOpenLinks.label")}
					description={t("capPro.autoOpenLinks.desc")}
					value={props.autoOpenShareableLinks}
					onChange={props.onAutoOpenShareableLinksChange}
				/>
			</SectionRows>
		</Section>
	);
}

function QualitySection(props: {
	studioQuality: StudioRecordingQuality;
	onStudioQualityChange: (value: StudioRecordingQuality) => void;
}) {
	const { t } = useI18n();
	return (
		<Section title={t("quality.title")} description={t("quality.desc")}>
			<SectionCard>
				<StudioQualitySubsection
					value={props.studioQuality}
					onChange={props.onStudioQualityChange}
				/>
			</SectionCard>
		</Section>
	);
}

function ServerURLSetting(props: {
	value: string;
	defaultValue: string;
	onChange: (v: string) => void;
}) {
	const { t } = useI18n();
	const [value, setValue] = createWritableMemo(() => props.value);
	const isDefaultValue = () =>
		props.value === props.defaultValue && value() === props.defaultValue;
	const resetToDefault = () => {
		if (props.value === props.defaultValue) {
			setValue(props.defaultValue);
			return;
		}

		props.onChange(props.defaultValue);
	};

	return (
		<Section title={t("serverUrl.title")} description={t("serverUrl.desc")}>
			<SectionCard padded>
				<div class="flex flex-col gap-3">
					<label class="flex flex-col gap-1.5">
						<span class="text-[13px] text-gray-12">{t("serverUrl.label")}</span>
						<Input
							class="bg-gray-3"
							value={value()}
							onInput={(e) => setValue(e.currentTarget.value)}
						/>
					</label>
					<div class="flex justify-end gap-2">
						<Button
							size="sm"
							variant="gray"
							disabled={isDefaultValue()}
							onClick={resetToDefault}
						>
							{t("serverUrl.resetToDefault")}
						</Button>
						<Button
							size="sm"
							variant="dark"
							disabled={props.value === value()}
							onClick={() => props.onChange(value())}
						>
							{t("serverUrl.update")}
						</Button>
					</div>
				</div>
			</SectionCard>
		</Section>
	);
}

function DefaultProjectNameCard(props: {
	value: string | null;
	onChange: (name: string | null) => Promise<void>;
}) {
	const { t } = useI18n();
	const MOMENT_EXAMPLE_TEMPLATE = "{moment:DDDD, MMMM D, YYYY h:mm A}";
	const macos = type() === "macos";
	const today = new Date();
	const datetime = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
		macos ? 9 : 12,
		macos ? 41 : 0,
		0,
		0,
	).toISOString();

	let inputRef: HTMLInputElement | undefined;

	const dateString = today.toISOString().split("T")[0];
	const initialTemplate = () => props.value ?? DEFAULT_PROJECT_NAME_TEMPLATE;

	const [inputValue, setInputValue] = createSignal<string>(initialTemplate());
	const [preview, setPreview] = createSignal<string | null>(null);
	const [momentExample, setMomentExample] = createSignal("");

	async function updatePreview(val = inputValue()) {
		const formatted = await commands.formatProjectName(
			val,
			macos ? "Safari" : "Chrome",
			"Window",
			"instant",
			datetime,
		);
		setPreview(formatted);
	}

	onMount(() => {
		commands
			.formatProjectName(
				MOMENT_EXAMPLE_TEMPLATE,
				macos ? "Safari" : "Chrome",
				"Window",
				"instant",
				datetime,
			)
			.then(setMomentExample);

		const seed = initialTemplate();
		setInputValue(seed);
		if (inputRef) inputRef.value = seed;
		updatePreview(seed);
	});

	const isSaveDisabled = () => {
		const input = inputValue();
		return (
			!input ||
			input === (props.value ?? DEFAULT_PROJECT_NAME_TEMPLATE) ||
			input.length <= 3
		);
	};

	function CodeView(props: { children: string }) {
		return (
			<button
				type="button"
				title="Click to copy"
				class="px-1.5 py-0.5 mx-0.5 font-mono text-[11px] rounded-md transition-[background-color,color,transform] duration-150 ease-out cursor-pointer bg-gray-3 hover:bg-gray-4 active:scale-95 text-gray-12"
				onClick={() => commands.writeClipboardString(props.children)}
			>
				{props.children}
			</button>
		);
	}

	return (
		<Section
			title={t("defaultProjectName.title")}
			description={t("defaultProjectName.desc")}
			right={
				<>
					<Button
						size="sm"
						variant="gray"
						disabled={
							inputValue() === DEFAULT_PROJECT_NAME_TEMPLATE &&
							inputValue() !== props.value
						}
						onClick={async () => {
							await props.onChange(null);
							const newTemplate = initialTemplate();
							setInputValue(newTemplate);
							if (inputRef) inputRef.value = newTemplate;
							await updatePreview(newTemplate);
						}}
					>
						{t("defaultProjectName.reset")}
					</Button>
					<Button
						size="sm"
						variant="dark"
						disabled={isSaveDisabled()}
						onClick={async () => {
							await props.onChange(inputValue() ?? null);
							await updatePreview();
						}}
					>
						{t("defaultProjectName.save")}
					</Button>
				</>
			}
		>
			<SectionCard padded>
				<div class="flex flex-col gap-3">
					<Input
						autocorrect="off"
						ref={inputRef}
						type="text"
						class="bg-gray-3 font-mono"
						value={inputValue()}
						onInput={(e) => {
							setInputValue(e.currentTarget.value);
							updatePreview(e.currentTarget.value);
						}}
					/>

					<div class="flex gap-2 items-center px-3 py-2 rounded-lg border border-dashed bg-gray-3 border-gray-5">
						<IconCapLogo class="pointer-events-none size-4 shrink-0" />
						<p class="text-xs text-gray-12 whitespace-pre-wrap">{preview()}</p>
					</div>

					<Collapsible class="w-full rounded-lg">
						<Collapsible.Trigger class="inline-flex gap-1 items-center text-xs transition-colors text-gray-10 hover:text-gray-12 group">
							<IconCapChevronDown class="size-3.5 data-group-expanded:rotate-180 transition-transform duration-200" />
							<span>{t("defaultProjectName.placeholders")}</span>
						</Collapsible.Trigger>

						<Collapsible.Content class="space-y-3 pt-3 text-xs text-gray-12 opacity-0 transition animate-collapsible-up data-expanded:animate-collapsible-down data-expanded:opacity-100">
							<p class="text-gray-10">
								Click any placeholder to copy it. Time supports custom formats
								via <code class="text-gray-12">{"{moment:HH:mm}"}</code>.
							</p>

							<div class="space-y-1">
								<p class="font-medium text-gray-12">Recording mode</p>
								<p>
									<CodeView>{"{recording_mode}"}</CodeView> → "Studio",
									"Instant", or "Screenshot"
								</p>
								<p>
									<CodeView>{"{mode}"}</CodeView> → "studio", "instant", or
									"screenshot"
								</p>
							</div>

							<div class="space-y-1">
								<p class="font-medium text-gray-12">Target</p>
								<p>
									<CodeView>{"{target_kind}"}</CodeView> → "Display", "Window",
									or "Area"
								</p>
								<p>
									<CodeView>{"{target_name}"}</CodeView> → Monitor name or
									window title.
								</p>
							</div>

							<div class="space-y-1">
								<p class="font-medium text-gray-12">Date &amp; time</p>
								<p>
									<CodeView>{"{date}"}</CodeView> → {dateString}
								</p>
								<p>
									<CodeView>{"{time}"}</CodeView> →{" "}
									{macos ? "09:41 AM" : "12:00 PM"}
								</p>
								<p class="flex flex-col items-start pt-1">
									<CodeView>{MOMENT_EXAMPLE_TEMPLATE}</CodeView> →{" "}
									{momentExample()}
								</p>
							</div>
						</Collapsible.Content>
					</Collapsible>
				</div>
			</SectionCard>
		</Section>
	);
}

function ExcludedWindowsCard(props: {
	excludedWindows: WindowExclusion[];
	missingDefaultExclusions: WindowExclusion[];
	availableWindows: CaptureWindow[];
	onRequestAvailableWindows: () => Promise<CaptureWindow[]>;
	onRemove: (index: number) => Promise<void>;
	onAdd: (window: CaptureWindow) => Promise<void>;
	onReset: () => Promise<void>;
	isLoading: boolean;
	isWindows: boolean;
}) {
	const { t } = useI18n();
	const hasExclusions = () => props.excludedWindows.length > 0;
	const hasMissingDefaultExclusions = () =>
		props.missingDefaultExclusions.length > 0;
	const missingDefaultLabels = () =>
		props.missingDefaultExclusions.map(getExclusionPrimaryLabel).join(", ");
	const canAdd = () => !props.isLoading;
	const handleResetClick = () => {
		if (props.isLoading) return;
		void props.onReset();
	};

	const handleAddClick = async (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		if (!canAdd()) return;

		// Use available windows if we have them, otherwise fetch
		let windows = props.availableWindows;

		// Only refresh if we don't have any windows cached
		if (!windows.length) {
			try {
				windows = await props.onRequestAvailableWindows();
			} catch (error) {
				console.error("Failed to fetch windows:", error);
				return;
			}
		}

		if (!windows.length) {
			console.log("No available windows to exclude");
			return;
		}

		try {
			const items = await Promise.all(
				windows.map((window) =>
					MenuItem.new({
						text: getWindowOptionLabel(window),
						action: () => {
							void props.onAdd(window);
						},
					}),
				),
			);

			const menu = await Menu.new({ items });

			// Save scroll position before popup
			const scrollPos = window.scrollY;

			await menu.popup();
			await menu.close();

			// Restore scroll position after menu closes
			requestAnimationFrame(() => {
				window.scrollTo(0, scrollPos);
			});
		} catch (error) {
			console.error("Error showing window menu:", error);
		}
	};

	return (
		<Section
			title={t("excludedWindows.title")}
			description={
				props.isWindows
					? t("excludedWindows.descWindows")
					: t("excludedWindows.desc")
			}
			right={
				<>
					<Button
						variant="gray"
						size="sm"
						disabled={props.isLoading}
						onClick={handleResetClick}
					>
						{t("excludedWindows.reset")}
					</Button>
					<Button
						variant="dark"
						size="sm"
						disabled={!canAdd()}
						onClick={(e) => void handleAddClick(e)}
						class="flex gap-1.5 items-center"
					>
						<IconLucidePlus class="size-3.5" />
						{t("excludedWindows.add")}
					</Button>
				</>
			}
		>
			<SectionCard padded>
				<Show when={hasMissingDefaultExclusions()}>
					<div class="mb-3 rounded-lg border border-amber-6 bg-amber-3/30 px-3 py-2.5">
						<div class="flex items-start gap-2">
							<IconLucideAlertTriangle class="mt-0.5 size-4 shrink-0 text-amber-11" />
							<div class="min-w-0 flex-1 space-y-1">
								<p class="text-xs font-medium text-amber-11">
									{t("excludedWindows.missingTitle")}
								</p>
								<p class="text-[10px] leading-snug text-amber-11">
									{t("excludedWindows.missingDesc", {
										labels: missingDefaultLabels(),
									})}
								</p>
							</div>
							<Button
								variant="gray"
								size="sm"
								disabled={props.isLoading}
								onClick={handleResetClick}
								class="shrink-0"
							>
								{t("excludedWindows.restore")}
							</Button>
						</div>
					</div>
				</Show>
				<Show when={!props.isLoading} fallback={<ExcludedWindowsSkeleton />}>
					<Show
						when={hasExclusions()}
						fallback={
							<p class="text-xs text-gray-10">{t("excludedWindows.empty")}</p>
						}
					>
						<div class="flex flex-wrap gap-2">
							<For each={props.excludedWindows}>
								{(entry, index) => (
									<div class="flex gap-2 items-center pr-1 pl-3 py-1.5 rounded-full border bg-gray-3 border-gray-4">
										<div class="flex flex-col leading-tight">
											<span class="text-xs text-gray-12">
												{getExclusionPrimaryLabel(entry)}
											</span>
											<Show when={getExclusionSecondaryLabel(entry)}>
												{(label) => (
													<span class="text-[10px] text-gray-9">{label()}</span>
												)}
											</Show>
										</div>
										<button
											type="button"
											class="flex justify-center items-center rounded-full transition-colors size-5 text-gray-10 hover:bg-gray-5 hover:text-gray-12"
											onClick={() => void props.onRemove(index())}
											aria-label={t("excludedWindows.removeAria")}
										>
											<IconLucideX class="size-3" />
										</button>
									</div>
								)}
							</For>
						</div>
					</Show>
				</Show>
			</SectionCard>
		</Section>
	);
}

function ExcludedWindowsSkeleton() {
	const chipWidths = ["w-28", "w-24", "w-32"] as const;

	return (
		<div class="flex flex-wrap gap-2" aria-hidden="true">
			<For each={chipWidths}>
				{(width) => (
					<div class="flex gap-2 items-center pr-1 pl-3 py-1.5 rounded-full border bg-gray-3 border-gray-4 animate-pulse">
						<div class="flex flex-col gap-1 leading-tight">
							<div class={cx("h-2.5 rounded-sm bg-gray-4", width)} />
							<div class="w-14 h-2 rounded-sm bg-gray-4" />
						</div>
						<div class="rounded-full size-5 bg-gray-4" />
					</div>
				)}
			</For>
		</div>
	);
}
