# 可配置录制/截图保存目录 — 设计规格

- 日期：2026-06-28
- 范围：Cap 桌面端（`apps/desktop`，Tauri + SolidJS）
- 状态：已批准设计，待实现

## 1. 背景与目标

当前录制与截图目录硬编码为 `app_data_dir().join("recordings"|"screenshots")`，在 Windows 上即 `%APPDATA%\so.cap.desktop\recordings`（C 盘）。用户无法在 UI 修改，C 盘空间吃紧时无法迁移。

目标：在设置 UI 中提供目录选择器，让用户分别自定义「录制保存目录」与「截图保存目录」，新录制/截图落到自定义位置。

## 2. 需求决策（已与用户确认）

1. **配置范围**：录制目录、截图目录**分别**配置（两个独立设置项）。
2. **迁移行为**：修改目录**只影响未来**的新录制/截图；旧文件原地保留，不迁移、不扫描、不保证继续在软件中展示。
3. **UI 位置**：「录制保存目录」放 Recordings 设置页顶部；「截图保存目录」放 Screenshots 设置页顶部。
4. **路径校验**：只校验**可写**（能创建目录、能写入文件），不做磁盘空间校验。
5. **录制中锁定**：正在录制/上传时，Recordings 页的目录选择器**禁用**并提示「请先停止录制」。Screenshots 页**不锁**（截图无长时写入/上传场景）。

### 默认决策（设计阶段采用，未经用户逐项确认）

- 保留「恢复默认」按钮，允许一键回退到 AppData 默认位置。
- Screenshots 页不做录制中锁定（理由见上）。

## 3. 方案

采用方案 A：扩展现有 `recordings_path`/`screenshots_path` helper 读取设置 + 新增带校验的 set 命令。

- 复用 `GeneralSettingsStore`（统一 store，specta 自动生成 TS 类型）。
- 复用 `lib.rs` 中已有的 `recordings_path(app)`/`screenshots_path(app)` 作为唯一解析入口。
- 校验集中在后端命令。

## 4. 详细设计

### 4.1 数据模型（`apps/desktop/src-tauri/src/general_settings.rs`）

`GeneralSettingsStore` 新增两个字段：

```rust
#[serde(default)]
pub custom_recordings_dir: Option<PathBuf>,
#[serde(default)]
pub custom_screenshots_dir: Option<PathBuf>,
```

- `None`（含空串）= 使用默认 AppData 位置。
- `Default::default()` 中设为 `None`。
- `PathBuf` 经 serde 序列化为字符串，specta `Type` derive 兼容。

### 4.2 解析入口（`apps/desktop/src-tauri/src/lib.rs`）

改造现有 helper：

```rust
pub(crate) fn recordings_path(app: &AppHandle) -> PathBuf {
    let path = effective_recordings_dir(app);
    std::fs::create_dir_all(&path).unwrap_or_default();
    path
}

pub(crate) fn screenshots_path(app: &AppHandle) -> PathBuf { /* 同理 */ }
```

新增纯解析函数：

```rust
pub(crate) fn effective_recordings_dir(app: &AppHandle) -> PathBuf {
    GeneralSettingsStore::get(app)
        .ok().flatten()
        .and_then(|s| s.custom_recordings_dir)
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or_else(|| app.path().app_data_dir().unwrap().join("recordings"))
}
```

`screenshots` 同理（回退 `join("screenshots")`）。

**收敛硬编码**：将以下 6 处改为调用上述 helper：

- `recording.rs:1421`（recordings）→ `recordings_path(app)`
- `recording.rs:2615`（screenshots）→ `screenshots_path(app)`
- `tray.rs:136`（recordings）→ `recordings_path(app)`
- `tray.rs:142`（screenshots）→ `screenshots_path(app)`
- `lib.rs:5972`、`lib.rs:5982`：已是 helper 内部，改为读 `effective_*`。

> 注意：`recording.rs`、`tray.rs` 当前是各自 `app_data_dir().join(...)`，需改为调用 `crate::recordings_path(app)`。需确认这些调用点能拿到 `AppHandle`（现有代码已持有）。

### 4.3 校验 + 写入命令（`apps/desktop/src-tauri/src/lib.rs` 或 `general_settings.rs`）

新增 2 个 Tauri 命令：

```rust
#[tauri::command]
#[specta::specta]
fn set_recordings_dir(app: AppHandle, path: Option<String>) -> Result<(), String>

#[tauri::command]
#[specta::specta]
fn set_screenshots_dir(app: AppHandle, path: Option<String>) -> Result<(), String>
```

统一逻辑（抽成私有函数 `apply_custom_dir(app, setter, path)`）：

1. `path` 为 `None` 或 trim 后为空 → 清除对应字段（设为 `None`），写 store，返回 `Ok(())`。
2. 否则做**可写校验**：
   - `std::fs::create_dir_all(&target)`；失败 → `Err("无法创建目录：{e}")`。
   - 在目录内创建临时文件（如 `.cap-write-test`）并立即删除；失败 → `Err("目录不可写：{e}")`。
   - 校验通过 → `GeneralSettingsStore::update` 写入字段，返回 `Ok(())`。
3. 校验失败时**不修改**现有设置。

需在 `lib.rs` 的 `invoke_handler!` 中注册这两个命令。

### 4.4 前端命令绑定

`apps/desktop/src/utils/tauri.ts` 由 specta 生成，新增命令自动出现，无需手改。

### 4.5 UI 组件（新增 `apps/desktop/src/routes/(window-chrome)/settings/DirSettingRow.tsx`）

复用组件，`props: { kind: "recordings" | "screenshots" }`：

- 布局：左侧标题 + 当前路径（自定义路径直接显示；默认路径显示并标注「默认」）；右侧「更改」按钮 + 「恢复默认」按钮（当前为默认时灰显）。
- 「更改」：`import { open } from "@tauri-apps/plugin-dialog"` → `open({ directory: true })`；选中后调用 `commands.setRecordingsDir(path)` / `setScreenshotsDir(path)`；成功后刷新当前路径显示；失败弹错误提示。
- 「恢复默认」：调用 `setRecordingsDir(null)` / `setScreenshotsDir(null)`。
- 当前路径读取：使用前端现成的 `generalSettingsStore`（`apps/desktop/src/store.ts:80`，`declareStore<GeneralSettingsStore>("general_settings")`）。通过 `generalSettingsStore.createQuery()` 拿到响应式数据，读 `data?.customRecordingsDir` / `customScreenshotsDir`（specta 已生成 camelCase 字段）。`None`/`undefined` 即默认位置，此时显示默认路径并标注。
- 设置写入成功后，需触发 `generalSettingsStore` 刷新以反映新值（具体刷新方式在实现阶段按 `declareStore` 的 API 确认）。
- **录制中锁定**（仅 `kind === "recordings"`）：当存在活跃录制（复用 `recordings.tsx` 的 `hasActiveRecording` 判断：状态 `InProgress`/`NeedsRemux` 或上传中），整行禁用并显示提示文案。

### 4.6 页面接入

- `apps/desktop/src/routes/(window-chrome)/settings/recordings.tsx`：在 `<Section>` 内顶部插入 `<DirSettingRow kind="recordings" />`。
- `apps/desktop/src/routes/(window-chrome)/settings/screenshots.tsx`：在对应 Section 顶部插入 `<DirSettingRow kind="screenshots" />`。

### 4.7 i18n

`apps/desktop/src/i18n/locales/zh.ts` 与 `en.ts` 新增 key（命名空间 `settings.storage.*`）：

- `recordingsTitle` / `recordingsDesc`
- `screenshotsTitle` / `screenshotsDesc`
- `change`（更改）、`resetDefault`（恢复默认）、`defaultLabel`（默认）
- `errorCreate` / `errorWritable`（错误信息）
- `lockedHint`（录制中提示）

## 5. 范围边界（不在本次）

- **不迁移、不扫描**已有录制/截图文件；目录切换后列表只展示当前配置目录下的内容。
- **CLI**（`apps/cli`）有独立的 recordings 路径逻辑，属独立工具，不在本次范围。
- 不做磁盘空间校验。
- 不处理「自定义目录在录制过程中被外部删除/不可用」的运行时修复（落到现有录制失败的错误处理路径）。

## 6. 错误处理

| 场景 | 处理 |
|---|---|
| 目标目录无法创建 | 命令返回中文错误，前端弹提示，不修改设置 |
| 目录不可写 | 同上 |
| 用户在对话框取消选择 | 前端无操作，不调命令 |
| 设置文件反序列化失败 | 沿用 `GeneralSettingsStore::get` 现有降级（返回 None → 回退默认） |
| 录制中尝试修改 | 前端禁用，无法触发 |

## 7. 测试（TDD，先写后实现）

### 后端（Rust）

- `effective_recordings_dir`：无设置 → 回退默认；有非空设置 → 返回自定义；空串 → 回退默认。（screenshots 同理）
- `apply_custom_dir`：可写目录 → 通过并持久化；不可写目录 → 拒绝且不改设置；`None`/空 → 清除字段。

> 纯解析逻辑可拆出便于单测；依赖 `AppHandle`/store 的部分通过现有测试模式处理或抽 trait。

### 前端

- `DirSettingRow`：`hasActiveRecording=true`（recordings kind）时「更改」「恢复默认」按钮 disabled。
- 默认路径时「恢复默认」灰显。

## 8. 实现顺序（供 writing-plans 参考）

1. 后端：加字段 → 改 helper → 收敛 6 处调用 → 加 set 命令并注册 → 写后端测试。
2. 前端：i18n 文案 → `DirSettingRow` 组件 + 测试 → 接入两个页面。
3. 手动验证：改目录→新录制落到新位置；恢复默认；录制中锁定；旧目录内容不再作为验收范围。
