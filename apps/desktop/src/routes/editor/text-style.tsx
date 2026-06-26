import { createWritableMemo } from "@solid-primitives/memo";
import {
	getHexColorDigitCount,
	normalizeOpaqueHexColor,
} from "~/utils/hex-color";
import type { OrganizationBrandColorSwatch } from "~/utils/organization-branding";
import { BrandColorsDropdown } from "./BrandColorsDropdown";
import { getColorPreviewBorderColor } from "./color-utils";
import { TextInput } from "./TextInput";

export const FONT_OPTIONS = [
	{
		value: "System Sans-Serif",
		label: "System Sans-Serif",
		labelKey: "editor.captions.fontSystemSansSerif",
	},
	{
		value: "System Serif",
		label: "System Serif",
		labelKey: "editor.captions.fontSystemSerif",
	},
	{
		value: "System Monospace",
		label: "System Monospace",
		labelKey: "editor.captions.fontSystemMonospace",
	},
];

export const CAPTION_POSITION_OPTIONS = [
	{ value: "manual", label: "Manual", labelKey: "editor.captions.positionManual" },
	{
		value: "top-left",
		label: "Top Left",
		labelKey: "editor.captions.positionTopLeft",
	},
	{
		value: "top-center",
		label: "Top Center",
		labelKey: "editor.captions.positionTopCenter",
	},
	{
		value: "top-right",
		label: "Top Right",
		labelKey: "editor.captions.positionTopRight",
	},
	{
		value: "bottom-left",
		label: "Bottom Left",
		labelKey: "editor.captions.positionBottomLeft",
	},
	{
		value: "bottom-center",
		label: "Bottom Center",
		labelKey: "editor.captions.positionBottomCenter",
	},
	{
		value: "bottom-right",
		label: "Bottom Right",
		labelKey: "editor.captions.positionBottomRight",
	},
];

export const KEYBOARD_POSITION_OPTIONS = [
	{
		value: "top-left",
		label: "Top Left",
		labelKey: "editor.captions.positionTopLeft",
	},
	{
		value: "top-center",
		label: "Top Center",
		labelKey: "editor.captions.positionTopCenter",
	},
	{
		value: "top-right",
		label: "Top Right",
		labelKey: "editor.captions.positionTopRight",
	},
	{
		value: "bottom-left",
		label: "Bottom Left",
		labelKey: "editor.captions.positionBottomLeft",
	},
	{
		value: "bottom-center",
		label: "Bottom Center",
		labelKey: "editor.captions.positionBottomCenter",
	},
	{
		value: "bottom-right",
		label: "Bottom Right",
		labelKey: "editor.captions.positionBottomRight",
	},
];

export const TEXT_WEIGHT_OPTIONS = [
	{ label: "Normal", labelKey: "editor.captions.weightNormal", value: 400 },
	{ label: "Medium", labelKey: "editor.captions.weightMedium", value: 500 },
	{ label: "Bold", labelKey: "editor.captions.weightBold", value: 700 },
];

export const CAPTION_ANIMATION_OPTIONS = [
	{ value: "none", label: "None", labelKey: "editor.captions.animationNone" },
	{ value: "bounce", label: "Bounce", labelKey: "editor.captions.animationBounce" },
	{ value: "pop", label: "Pop", labelKey: "editor.captions.animationPop" },
];

export const CAPTION_HIGHLIGHT_STYLE_OPTIONS = [
	{
		value: "color",
		label: "Color",
		labelKey: "editor.captions.highlightStyleColor",
	},
	{ value: "pill", label: "Pill", labelKey: "editor.captions.highlightStylePill" },
];

export function getTextWeightLabel(weight: number | null | undefined) {
	const option = TEXT_WEIGHT_OPTIONS.find((option) => option.value === weight);
	if (option) return option.label;
	if (weight != null) return `Custom (${weight})`;
	return "Normal";
}

export function getTextWeightLabelKey(weight: number | null | undefined) {
	const option = TEXT_WEIGHT_OPTIONS.find((option) => option.value === weight);
	if (option) return option.labelKey;
	return "editor.captions.weightNormal";
}

export function HexColorInput(props: {
	value: string;
	onChange: (value: string) => void;
	brandColorSwatches?: OrganizationBrandColorSwatch[];
}) {
	const [text, setText] = createWritableMemo(() => props.value);
	let prevColor = props.value;
	let colorInput!: HTMLInputElement;

	const commitValue = (raw: string) => {
		const normalized = normalizeOpaqueHexColor(raw);
		if (normalized) {
			props.onChange(normalized);
			setText(normalized);
			return true;
		}
		return false;
	};

	const selectBrandColor = (color: string) => {
		setText(color);
		prevColor = color;
		props.onChange(color);
	};

	return (
		<div class="flex flex-col gap-2">
			<div class="flex flex-row items-center gap-[0.75rem] relative">
				<button
					type="button"
					class="size-[2rem] rounded-[0.5rem]"
					style={{
						"background-color": text(),
						"box-shadow": `inset 0 0 0 1px ${getColorPreviewBorderColor(
							text(),
						)}`,
					}}
					onClick={() => colorInput.click()}
				/>
				<input
					ref={colorInput}
					type="color"
					class="absolute left-0 bottom-0 size-[2rem] opacity-0"
					value={text()}
					onChange={(e) => {
						setText(e.target.value);
						props.onChange(e.target.value);
					}}
				/>
				<TextInput
					class="w-[5rem] p-[0.375rem] border border-gray-3 text-gray-12 rounded-[0.5rem] bg-gray-2"
					value={text()}
					onFocus={() => {
						prevColor = props.value;
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							if (!commitValue(e.currentTarget.value)) {
								setText(prevColor);
							}
							e.currentTarget.blur();
						}
					}}
					onInput={(e) => {
						setText(e.currentTarget.value);
						if (getHexColorDigitCount(e.currentTarget.value) !== 6) return;

						const normalized = normalizeOpaqueHexColor(e.currentTarget.value);
						if (normalized) {
							props.onChange(normalized);
						}
					}}
					onBlur={(e) => {
						if (!commitValue(e.target.value)) {
							setText(prevColor);
							props.onChange(props.value);
						}
					}}
				/>
			</div>
			<BrandColorsDropdown
				swatches={props.brandColorSwatches ?? []}
				onSelect={selectBrandColor}
			/>
		</div>
	);
}
