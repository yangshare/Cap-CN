import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { getVersion } from "@tauri-apps/api/app";
import * as dialog from "@tauri-apps/plugin-dialog";
import { check } from "@tauri-apps/plugin-updater";
import { createSignal, createUniqueId, For, onMount } from "solid-js";
import { useI18n } from "~/i18n/I18nProvider";
import { commands } from "~/utils/tauri";

export default function Debug() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const [version, setVersion] = createSignal<string>("");
	const [updateStatus, setUpdateStatus] = createSignal<string>("");
	const [isChecking, setIsChecking] = createSignal(false);

	onMount(async () => {
		const v = await getVersion();
		setVersion(v);
	});

	const checkForUpdates = async () => {
		setIsChecking(true);
		setUpdateStatus(t("debug.updates.checking"));
		try {
			const update = await check();
			if (update) {
				setUpdateStatus(t("debug.updates.updateAvailable", { version: update.version }));
			} else {
				setUpdateStatus(t("debug.updates.noUpdateAvailable"));
			}
		} catch (e) {
			setUpdateStatus(t("debug.updates.error", { error: String(e) }));
		}
		setIsChecking(false);
	};

	const simulateUpdatePopup = async () => {
		const fakeVersion = "99.0.0";
		setUpdateStatus(t("debug.updates.simulating", { version: fakeVersion }));

		const shouldUpdate = await dialog.confirm(
			t("debug.updates.dialog.message", { version: fakeVersion }),
			{
				title: t("debug.updates.dialog.title"),
				okLabel: t("debug.updates.dialog.update"),
				cancelLabel: t("debug.updates.dialog.ignore"),
			},
		);

		if (shouldUpdate) {
			navigate("/update");
		} else {
			setUpdateStatus(t("debug.updates.userDeclined"));
		}
	};

	const fails = createQuery(() => ({
		queryKey: ["fails"],
		queryFn: () => commands.listFails(),
	}));

	const orderedFails = () => Object.entries(fails.data ?? {});

	return (
		<main class="w-full h-full bg-gray-2 text-(--text-primary) p-4">
			<h2 class="text-2xl font-bold">{t("debug.windows.title")}</h2>
			<div class="p-2 mb-4">
				<button
					class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-sm"
					onClick={() => commands.showWindow("Onboarding")}
				>
					{t("debug.windows.showOnboarding")}
				</button>
				<button
					class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-sm"
					onClick={() =>
						commands.showWindow({ InProgressRecording: { countdown: 3 } })
					}
				>
					{t("debug.windows.showRecordingControls")}
				</button>
			</div>

			<h2 class="text-2xl font-bold mt-4">{t("debug.updates.title")}</h2>
			<div class="p-2 mb-4">
				<p class="mb-2 text-sm text-(--text-secondary)">
					{t("debug.updates.currentVersion", { version: version() })}
				</p>
				<div class="flex flex-row gap-2 items-center">
					<button
						class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-sm disabled:opacity-50"
						onClick={checkForUpdates}
						disabled={isChecking()}
					>
						{t("debug.updates.checkForUpdates")}
					</button>
					<button
						class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-sm"
						onClick={() => navigate("/update")}
					>
						{t("debug.updates.goToUpdatePage")}
					</button>
					<button
						class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-sm disabled:opacity-50"
						onClick={simulateUpdatePopup}
						disabled={isChecking()}
					>
						{t("debug.updates.simulateUpdateFlow")}
					</button>
				</div>
				{updateStatus() && <p class="mt-2 text-sm">{updateStatus()}</p>}
			</div>

			<h2 class="text-2xl font-bold mt-4">{t("debug.failPoints.title")}</h2>
			<ul class="p-2">
				<For each={orderedFails()}>
					{(fail) => {
						const id = createUniqueId();

						return (
							<li class="flex flex-row items-center gap-2">
								<input
									class="size-4"
									id={id}
									type="checkbox"
									checked={fail[1]}
									value={fail[1].toString()}
									onClick={(e) => {
										e.preventDefault();
										commands
											.setFail(fail[0], !fail[1])
											.then(() => fails.refetch());
									}}
								/>
								<label for={id}>{fail[0]}</label>
							</li>
						);
					}}
				</For>
			</ul>
		</main>
	);
}
