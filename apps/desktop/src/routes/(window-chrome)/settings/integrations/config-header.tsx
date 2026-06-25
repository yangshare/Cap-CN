import { Button } from "@cap/ui-solid";
import { useNavigate } from "@solidjs/router";
import IconLucideArrowLeft from "~icons/lucide/arrow-left";
import { useI18n } from "~/i18n/I18nProvider";

export function IntegrationConfigHeader(props: { title: string }) {
	const navigate = useNavigate();
	const { t } = useI18n();

	return (
		<div class="flex shrink-0 justify-between items-center pb-3">
			<Button
				variant="gray"
				size="sm"
				class="gap-1.5"
				onClick={() => navigate("/settings/integrations")}
			>
				<IconLucideArrowLeft class="size-3.5" />
				{t("settings.integrations.headerBack")}
			</Button>
			<h3 class="text-sm font-semibold tracking-tight text-gray-12">
				{props.title}
			</h3>
		</div>
	);
}
