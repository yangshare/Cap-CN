# Cap-CN 桌面端 i18n 迁移 — 交接清单

> 本文供接手继续迁移工作的 LLM / 开发者使用。描述当前进度、架构约束、剩余待办与验证方式。

## 一、当前状态总览

- **提交基线**：`8e983aa05`（分支 `CN`），65 文件，+5076 / −1347。
- **已完成区域**：基础设施 + 主界面、设置、录制流程、截图编辑器、**`editor/` 视频编辑器（已完成，详见第十节）**。
- **剩余区域**：无。桌面端面向用户的 UI 文本已全面接入 i18n。
- **未纳入提交**：`CLAUDE.md`（superpowers-zh 框架安装，与 i18n 无关，留在工作区另行处理）；editor 迁移的全部改动（32 个 `.tsx` + `en.ts`/`zh.ts`）目前**留在工作区未提交**，待用户确认后提交。

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

## 五、`editor/` 目录迁移（✅ 已完成）

> 本节原为「剩余待办」，现已完成。下方批次表保留作历史参考；实际执行方式见**第十节**。
> **关于 `ConfigSidebar.tsx`**：原交接称「已被回退需从头做」——实际核实该文件在基线 `8e983aa05` 已完成组件迁移（`useI18n` + `editor.config.*` 调用），且 `editor.config` 字典子树已存在，无需重做。

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

## 十、`editor/` 迁移完成记录（2026-06-26）

### 实际做法
- **组件层**：32 个 `.tsx` 文件全部接入 i18n（`useI18n` + `t()` 替换硬编码英文）。多数文件在基线 `8e983aa05` 已完成组件迁移；本轮补齐剩余文件（`ShadowSettings`、`AspectRatioSelect`、`BrandColorsDropdown` 手动迁移）并处理变量遮蔽。
- **字典层**：`en.ts` / `zh.ts` 各 **+547 行**，在 `editor` 命名空间 `config` 子树之后新增 20 个同级子树，共 **285 个新键**（editor 命名空间叶节点总计约 437）。
- **执行方式**：蜂群模式（Workflow 多 agent 编排）。组件注入按文件并发（不同 `.tsx` 无竞态），字典合并由单点收口（避免 `en.ts`/`zh.ts` 写入竞态）。

### 新增 editor 子命名空间
`editor`(根级)、`ui`、`aspectRatio`、`brandColors`、`shadow`、`import`、`captionsRegen`、`error`、`header`、`presets`、`performance`、`captions`、`gradient`、`clips`、`export`、`keyboardTab`、`org`、`player`、`transcript`、`timeline`（含 `index`/`clip`/`scene`/`mask`/`keyboard`/`captions`/`text`/`zoom`/`trackManager`）、`share`。

### 已处理的协调特例
- **`editor.timeline.scene.mode`**（单数）：代码用单数 `mode.*`，字典建单数子树（`cameraOnly`/`hideCamera`/`splitScreen`/`default`），未动既有复数 `editor.config.scene.modes`。
- **`editor.ui.cancel` / `editor.ui.comingSoon`**：在 `editor.ui` 下独立建键，不复用 `screenshotEditor.ui`。
- **`editor.keyboardTab.textWeightCustom`**：插值统一单括号 `Custom ({weight})` / `自定义 ({weight})`（agent 草稿误为 `{{weight}}` 双括号，已修正——`resolveTemplate` 只认单括号）。
- **`editor.config.*`** 已存在且完整，未重复添加。
- **全部插值统一单括号**：`{count}`/`{name}`/`{n}`/`{seconds}`/`{weight}` 等。

### 英文原文来源
约 65% 取自迁移 agent 的结构化翻译输出（ImportProgress / CaptionsRegenerateBadge / EditorErrorScreen / PresetsDropdown / PerformanceOverlay / Header / ClipsSidebar / TranscriptPage / Player / KeyboardTab / OrganizationDropdown / GradientEditor / CaptionsTrack / KeyboardTrack / MaskTrack / TextTrack / ZoomTrack / SceneTrack / CaptionsTab / TrackManager / ClipTrack 等）；约 35% 用 `git show 8e983aa05^:<file>` 查迁移前英文原文再翻译（主要 ExportPage 约 60 键、ShareButton 15 键、AspectRatioSelect/BrandColorsDropdown/ShadowSettings 7 键）。

### 修复的迁移引入错误
- `Timeline/ClipTrack.tsx:767`：`t("editor.timeline.clip.labelWithIndex", { index: seg.recordingSegment })` 中 `seg.recordingSegment` 为 `number | undefined`，与 `resolveTemplate` 的 `string | number` 不兼容（迁移前模板字符串容忍 undefined）。改为 `index: seg.recordingSegment ?? 0`。

### 验证结果
- **tsc**：仅剩 2 个既有忽略错误（`context.ts:229`、`captions.ts:242`，均为 `CaptionSettings` 不匹配），无新错误；`zh.ts satisfies RawDictionary` 通过（en/zh 结构镜像）。
- **键完整性差集**：实际使用的 652 个静态 `editor.*` 键全部命中字典（0 缺失）；字典 editor 叶节点 654 个。
- **动态键**：`editor.timeline.index.track.${type}` 的 7 个取值（clip/caption/keyboard/text/mask/zoom/scene）在字典中全覆盖。

### 未提交
全部改动留在工作区，未 `git commit`。`git status` 可见 32 个 `.tsx` + `en.ts` + `zh.ts` + 本文档。待用户确认后提交。
