# Cap-CN 桌面端 i18n 迁移 — 交接清单

> 本文供接手继续迁移工作的 LLM / 开发者使用。描述当前进度、架构约束、剩余待办与验证方式。

## 一、当前状态总览

- **提交基线**：`8e983aa05`（分支 `CN`），65 文件，+5076 / −1347。
- **已完成区域**：基础设施 + 主界面、设置、录制流程、截图编辑器。
- **剩余区域**：`editor/` 视频编辑器（约 30 个文件，完全未迁移）。
- **未纳入提交**：`CLAUDE.md`（superpowers-zh 框架安装，与 i18n 无关，留在工作区另行处理）。

## 二、i18n 架构（已就绪，不要改）

| 文件 | 作用 |
|------|------|
| `apps/desktop/src/i18n/locales/en.ts` | **英文权威源**，结构标杆 |
| `apps/desktop/src/i18n/locales/zh.ts` | 中文，必须 `satisfies RawDictionary`（缺键编译报错） |
| `apps/desktop/src/i18n/I18nProvider.tsx` | 响应式翻译器 + `i18nSettingsStore.listen` 跨窗口同步 |
| `apps/desktop/src/i18n/index.ts` | `Locale` / `RawDictionary` / `fetchDictionary` / `detectLocale` |
| `apps/desktop/src/i18n/store.ts` | `i18nSettingsStore`（基于 `declareStore`，持久化 `language`） |

用法：

```tsx
import { useI18n } from "~/i18n/I18nProvider";
const { t } = useI18n();
t("namespace.path.key");
t("key", { var: value });   // 单括号 {var} 插值
```

## 三、必须遵守的「已验证事实」（踩坑点）

1. **数组索引化有效**：`flatten` 把 `["a","b"]` 扁平化为 `key.0` / `key.1`，`t("ns.key.0")` 可取值。重复同类条目（步骤、特性列表）优先用数组 + `Array.from({length:N},(_,i)=>t(\`ns.x.${i}\`))`。
2. **`t` 是松散 `string` 类型**，tsc **不校验路径**——漏 key 只在运行时表现为 `undefined`。每个被引 key 必须同时加进 `en.ts` 和 `zh.ts`。
3. **变量遮蔽**（最高频坑）：组件内常见 `const t = setTimeout(...)`、`.find((t)=>...)`、`toast.custom((t)=>...)`、`createTimer` / 回调形参 `t`。引入 i18n `t` 后必须把局部 `t` 重命名（`timer` / `(item)=>` / `(toastItem)=>` 等）。
4. **字面花括号文本**：占位符示例（如 `{year}`、`{"text":"{share_link}"}`）若含字面 `{}`，保留英文或改无括号表述，否则会被 `resolveTemplate` 误解析。
5. **不改非文本**：业务逻辑、事件、样式类名、图标、属性键名、传给后端的枚举字符串值一律不动。

## 四、字典命名空间现状（接手时优先复用）

已有顶层命名空间：`mode`、`settings.*`（recordings / screenshots / hotkeys / cli / feedback / transcription / changelog / experimental / license / automations / integrations / language）、`appearance`、`app`、`capPro`、`quality`、`recording`、`defaultProjectName`、`excludedWindows`、`serverUrl`、`telemetry`、`common`、`onboarding`、`newMain`、`recordingInProgress`、`captureArea`、`camera`、`recordingsOverlay`、`targetSelect`、`upgrade`、`debug`、`modeSelect`、`selectionHint`、`screenshotEditor`。

`editor` 建议新建 `editor.*`（如 `editor.header`、`editor.configSidebar`、`editor.export`、`editor.captions`、`editor.clips`、`editor.transcript`、`editor.player`、`editor.share` 等）。

## 五、剩余待办：`editor/` 目录（按大小排序，建议拆批串行）

> **串行原因**：每批都改 `en.ts` / `zh.ts`，并行会有字典写入竞态。每批一个 subagent，一批完成再派下一批。
> **`ConfigSidebar.tsx` 已被回退**——之前有个半成品迁移（引入 `useI18n` 但未完成）已 `git checkout` 还原，需从头做。

| 批次 | 文件（字节） |
|------|------|
| **批次 1**（单独，超大需分次读） | `ConfigSidebar.tsx` (136K) |
| **批次 2** | `ExportPage.tsx` (56K)、`CaptionsTab.tsx` (44K) |
| **批次 3** | `Editor.tsx` (42K)、`ClipsSidebar.tsx` (37K) |
| **批次 4** | `TranscriptPage.tsx` (24K)、`Player.tsx` (19K)、`KeyboardTab.tsx` (17K)、`OrganizationDropdown.tsx` (15K)、`TextOverlay.tsx` (15K) |
| **批次 5**（中小） | `ui.tsx`(14K)、`MaskOverlay.tsx`(11K)、`ShareButton.tsx`(11K)、`Header.tsx`(10K)、`GradientEditor.tsx`(9K)、`CaptionOverlay.tsx`(9K)、`editor-skeleton.tsx`(8K)、`SplitScreenOverlay.tsx`(8K)、`PerformanceOverlay.tsx`(7K)、`EditorErrorScreen.tsx`(5K)、`PresetsDropdown.tsx`(5K)、`text-style.tsx`(4K)、`ImportProgress.tsx`(4K)、`CaptionsRegenerateBadge.tsx`(4K)、`AspectRatioSelect.tsx`(3K)、`color-utils.tsx`(3K)、`BrandColorsDropdown.tsx`(3K)、`ShadowSettings.tsx`(2K)、`index.tsx`(2K)、`TextInput.tsx`(0.4K) |

每个文件处理流程：先读、识别面向用户的英文 → 加 en/zh 键 → 注入 `useI18n` 替换 → 处理变量遮蔽 → tsc 自检。

## 六、验证方式

```powershell
cd 'E:\开源项目\录屏软件\Cap-CN\apps\desktop'
pnpm exec tsc --noEmit -p tsconfig.json
```

**既有无关错误（必须忽略，不要试图修复）**：

- `src/routes/editor/context.ts:229` — `CaptionSettings` 不匹配
- `src/store/captions.ts:242` — `CaptionSettings` 不匹配

只要改动不产生**新的** tsc 错误即可。迁移 `editor/context.ts` 时尤其注意别在这些既有错误行上叠加新问题。

## 七、环境约束（务必遵守）

- Windows，**用 PowerShell 工具 + Windows 原生路径**（如 `E:\开源项目\录屏软件\Cap-CN`），不要用 POSIX 路径或 Bash 工具。
- 路径含括号：`apps/desktop/src/routes/(window-chrome)/...`（Grep / Read 时注意转义或用绝对路径）。
- 提交用中文 commit message；当前在 `CN` 分支可直接提交。
- **不要 `git commit`** 除非用户明确要求。

## 八、运行时验证（迁移完成后建议做）

1. `pnpm dev` 启动，默认检测中文环境 → 界面显示中文。
2. 设置页 → 语言切换为 English → 实时变英文，切回即时变中文。
3. 切换语言后重启，语言保持；多窗口（设置 / 主窗口）同步更新。

## 九、已迁移完成的文件清单（参考）

- 基础设施：`i18n/I18nProvider.tsx`、`i18n/index.ts`、`i18n/store.ts`、`i18n/locales/en.ts`、`i18n/locales/zh.ts`、`app.tsx`、`store.ts`、`package.json`
- 试点：`components/ModeSelect.tsx`、`routes/(window-chrome)/settings/general.tsx`（含语言切换 UI）
- 引导：`routes/(window-chrome)/onboarding.tsx`
- 主窗口：`routes/(window-chrome)/new-main/` 全部（index、TargetCard、TargetMenuGrid、CameraSelect、DeviceSelectOverlay、MicrophoneSelect、ModeInfoPanel、SystemAudio、ChangeLogButton、TargetSelectInfoPill 等）
- 设置子页：`routes/(window-chrome)/settings/` 下 recordings、automations、screenshots、license、hotkeys、cli、feedback、transcription、changelog、experimental、Setting、integrations 全部
- 核心录制流程：`routes/` 下 in-progress-recording、target-select-overlay、camera、recordings-overlay、capture-area、mode-select、debug、`(window-chrome)/upgrade.tsx`、`components/selection-hint.tsx`
- 截图编辑器：`routes/screenshot-editor/` 全部（含 popovers 子目录、`useScreenshotExport.ts`、共享组件 `components/Cropper.tsx` 扩展）
