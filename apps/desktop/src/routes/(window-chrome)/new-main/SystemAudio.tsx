import { createQuery } from "@tanstack/solid-query";
import { cx } from "cva";
import type { Component, ComponentProps, JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
	createCurrentRecordingQuery,
	isSystemAudioSupported,
} from "~/utils/queries";
import { useI18n } from "~/i18n/I18nProvider";
import { useRecordingOptions } from "../OptionsContext";
import {
	DEVICE_ROW_CLASS,
	DEVICE_ROW_ICON_CLASS,
	DEVICE_ROW_LABEL_CLASS,
	DEVICE_ROW_TRAILING_CLASS,
} from "./deviceRowStyles";
import InfoPill from "./InfoPill";

export default function SystemAudio() {
	return (
		<SystemAudioToggleRoot
			class={cx(DEVICE_ROW_CLASS, "KSelect")}
			PillComponent={InfoPill}
			icon={<IconPhMonitorBold class={DEVICE_ROW_ICON_CLASS} />}
		/>
	);
}

export function SystemAudioToggleRoot(
	props: Omit<
		ComponentProps<"button">,
		"onClick" | "disabled" | "title" | "type" | "children"
	> & {
		PillComponent: Component<{
			variant: "blue" | "red" | "gray";
			children: JSX.Element;
		}>;
		icon: JSX.Element;
	},
) {
	const { t } = useI18n();
	const { rawOptions, setOptions } = useRecordingOptions();
	const currentRecording = createCurrentRecordingQuery();
	const systemAudioSupported = createQuery(() => isSystemAudioSupported);

	const isDisabled = () =>
		!!currentRecording.data || systemAudioSupported.data === false;
	const tooltipMessage = () => {
		if (systemAudioSupported.data === false) {
			return t("newMain.devices.systemAudioTooltip");
		}
		return undefined;
	};

	return (
		<button
			{...props}
			type="button"
			title={tooltipMessage()}
			onClick={() => {
				if (!rawOptions || isDisabled()) return;
				setOptions({ captureSystemAudio: !rawOptions.captureSystemAudio });
			}}
			disabled={isDisabled()}
			aria-pressed={rawOptions.captureSystemAudio ? "true" : "false"}
		>
			{props.icon}
			<p class={DEVICE_ROW_LABEL_CLASS}>
				{rawOptions.captureSystemAudio
					? t("newMain.devices.recordSystemAudio")
					: t("newMain.devices.noSystemAudio")}
			</p>
			<div class={DEVICE_ROW_TRAILING_CLASS}>
				<Dynamic
					component={props.PillComponent}
					variant={rawOptions.captureSystemAudio ? "blue" : "gray"}
				>
					{rawOptions.captureSystemAudio
						? t("newMain.devices.on")
						: t("newMain.devices.off")}
				</Dynamic>
			</div>
		</button>
	);
}
