const settingsNavDefinitions = [
	{
		href: "general",
		nameKey: "settings.nav.general",
	},
	{
		href: "hotkeys",
		nameKey: "settings.nav.hotkeys",
	},
	{
		href: "cli",
		nameKey: "settings.nav.cli",
	},
	{
		href: "recordings",
		nameKey: "settings.nav.recordings",
	},
	{
		href: "screenshots",
		nameKey: "settings.nav.screenshots",
	},
	{
		href: "automations",
		nameKey: "settings.nav.automations",
	},
	{
		href: "transcription",
		nameKey: "settings.nav.transcription",
	},
	{
		href: "integrations",
		nameKey: "settings.nav.integrations",
	},
	{
		href: "license",
		nameKey: "settings.nav.license",
	},
	{
		href: "experimental",
		nameKey: "settings.nav.experimental",
	},
	{
		href: "feedback",
		nameKey: "settings.nav.feedback",
	},
	{
		href: "changelog",
		nameKey: "settings.nav.changelog",
	},
] as const;

export type SettingsNavHref = (typeof settingsNavDefinitions)[number]["href"];
type SettingsNavNameKey = (typeof settingsNavDefinitions)[number]["nameKey"];
type TranslateSettingsNav = (key: SettingsNavNameKey) => string;

export function createSettingsNavItems(t: TranslateSettingsNav) {
	return settingsNavDefinitions.map((item) => ({
		...item,
		name: () => t(item.nameKey),
	}));
}
