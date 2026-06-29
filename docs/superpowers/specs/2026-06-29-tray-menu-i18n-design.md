# 系统托盘菜单国际化（i18n）设计

> 2026-06-29 · 分支 `CN` · 目标：让 Tauri 后端构建的系统托盘菜单随用户语言（en / zh）显示。

## 一、背景与问题

桌面端前端 UI 已全面接入 i18n（`apps/desktop/src/i18n/`，`Locale = "en" | "zh"`，字典 `locales/en.ts`、`locales/zh.ts`，`useI18n()` + `t()`）。但**系统托盘菜单由 Rust 端 `apps/desktop/src-tauri/src/tray.rs` 构建，其中约 21 条菜单文案均为硬编码英文**（如 `"Open Main Window"`、`"Record Display"`、`"Select Mode"`、`"Quit Cap"` 等），未接入任何翻译机制。

### 关键约束（已核实）

1. **Rust 已能直接读前端 store**：`tauri_plugin_store` 已是依赖（`Cargo.toml:38`）。`recording_settings.rs:41`、`auth.rs`、`hotkeys.rs`、`general_settings.rs` 等多处用 `app.store("store").map(|s| s.get(KEY))` 读取前端 `declareStore` 写入的持久化数据。
2. **语言偏好存储位置**：前端 `i18nSettingsStore = declareStore("i18n")`（`i18n/store.ts:7`）→ 实际写入 Tauri store `"store"` 中 key 为 `"i18n"` 的条目，值为 `{ language: "zh" | "en" }`（`store.ts:26` → `Store.load("store")`，`declareStore` 的 `name` 仅作 key）。
3. **首启动不写 store**：前端 `I18nProvider` 的 `detectLocale()`（`i18n/index.ts:45`）在首启动仅用 `navigator.language` 检测系统语言并用于内存信号，**不写入 store**；只有用户在设置里显式切换语言（`setLocale` → `i18nSettingsStore.set`）才会写 store。因此 Rust 若仅读 store `"i18n"`，会漏掉首启动的中文用户，必须保留系统 locale 回退。
4. **托盘在 webview 之前构建**：`create_tray` 在 `setup` 阶段执行，此时前端尚未就绪——故「前端驱动推送翻译」存在时序问题，不可取。

## 二、方案选择

| 方案 | 结论 |
|------|------|
| **D（采纳）Rust 内嵌小字典 + 读 store/系统 locale** | 与现有代码模式一致；启动即可用；无跨进程竞态；改动最小 |
| A 前端驱动推送翻译 | 否决：托盘先于前端构建，时序不可靠 |
| B Rust 读独立 JSON 资源 | 否决：~20 条短文案不值得引入构建期同步工具链 |
| C 前端推 + 静态硬编码混合 | 否决：两套机制并存更乱 |

## 三、详细设计

### 3.1 依赖

`apps/desktop/src-tauri/Cargo.toml` 的 `[dependencies]` 新增：

```toml
sys-locale = "0.3"
```

`sys-locale 0.3.2` 已在 `Cargo.lock`（传递依赖），无新下载。

### 3.2 locale 解析（`tray.rs` 新增）

```rust
#[derive(Clone, Copy, PartialEq)]
enum TrayLocale { En, Zh }

fn tray_locale(app: &AppHandle) -> TrayLocale {
    let explicit = app
        .store("store")
        .ok()
        .and_then(|s| s.get("i18n"))
        .and_then(|v| v.get("language").and_then(|l| l.as_str()).map(str::to_owned));
    if let Some(lang) = explicit {
        return match lang.as_str() {
            "zh" => TrayLocale::Zh,
            _ => TrayLocale::En,
        };
    }

    let is_zh = sys_locale::get_locales()
        .any(|l| l.to_lowercase().starts_with("zh"));
    if is_zh { TrayLocale::Zh } else { TrayLocale::En }
}
```

解析顺序：先读取显式语言偏好 `store["i18n"].language`，再回退到系统 locale（镜像前端 `detectLocale` 的 `zh*` 判断）。`tauri-plugin-store` 的 Rust 侧 `Store::get(key)` 返回 `Option<serde_json::Value>`；需要类型化结构时再用 `serde_json::from_value`，与 `RecordingSettingsStore::get` 的读取形态一致。

### 3.3 翻译表（`tray.rs` 新增）

```rust
#[derive(Clone, Copy)]
enum TrayText {
    OpenMainWindow,
    RecordDisplay, RecordWindow, RecordArea,
    ScreenshotDisplay, ScreenshotWindow, ScreenshotArea,
    TakeScreenshot,
    ImportVideo,
    SelectMode, ModeStudio, ModeInstant, ModeScreenshot,
    Previous, NoRecentItems,
    ViewAllRecordings, ViewAllScreenshots,
    Settings, UploadLogs, QuitCap, RequestPermissions,
}

fn tray_text(locale: TrayLocale, key: TrayText) -> &'static str {
    use TrayLocale::*;
    use TrayText::*;
}
```

`tray_text` 用 `match (locale, key)` 返回 `&'static str`，en/zh 两列全覆盖；新增 `TrayText` 变体时由编译器暴露未覆盖分支。

**中文文案**（已确认）：

| key | zh |
|-----|----|
| OpenMainWindow | 打开主窗口 |
| RecordDisplay / RecordWindow / RecordArea | 录制显示器 / 录制窗口 / 录制区域 |
| ScreenshotDisplay / ScreenshotWindow / ScreenshotArea | 截取显示器 / 截取窗口 / 截取区域 |
| TakeScreenshot | 截图 |
| ImportVideo | 导入视频… |
| SelectMode | 选择模式 |
| ModeStudio / ModeInstant / ModeScreenshot | 工作室 / 即时 / 截图 |
| Previous | 最近项目 |
| NoRecentItems | 暂无最近项目 |
| ViewAllRecordings / ViewAllScreenshots | 查看全部录制 / 查看全部截图 |
| Settings | 设置 |
| UploadLogs | 上传日志 |
| QuitCap | 退出 Cap |
| RequestPermissions | 请求权限 |

英文文案沿用当前硬编码原文（如 `"Open Main Window"`、`"Record Display"`、`"Take a Screenshot"`、`"Import Video..."`、`"View all recordings"`、`"Quit Cap"`、`"Request Permissions"`、`"No recent items"`、`"Previous"` 等）。

### 3.4 替换硬编码

下列函数中所有英文字面量替换为 `tray_text(tray_locale(app), TrayText::Xxx)`：

- `build_tray_menu`（`tray.rs:369`）：主菜单全部项 + minimal onboarding 分支（`should_use_minimal_onboarding_tray_menu` 为真时的 RequestPermissions / Quit Cap）。
- `create_mode_submenu`（`tray.rs:339`）：`"Select Mode"` 及三个模式 label。
- `create_previous_submenu`（`tray.rs:273`）：`"Previous"`、`"No recent items"`。

**保留不动**：
- 对齐/选中符号：`"✓ "`、三空格缩进（`create_mode_submenu` 中 `format!("✓ {label}")` / `format!("   {label}")`）。
- 类型指示 emoji：`"🎬 "`、`"⚡ "`、`"📷 "`（`create_previous_submenu`）。
- 品牌前缀：`format!("Cap v{}", env!("CARGO_PKG_VERSION"))`。
- `TrayItem` 枚举、`MenuId` 映射（`From`/`TryFrom`）、`on_menu_event` 事件处理逻辑、分隔符 `PredefinedMenuItem::separator`。
- `"previous"` / `"previous_empty"` / `"select_mode"` / `"version"` 等 **MenuId**（非显示文本，保持不变）。

### 3.5 刷新时机（不改）

复用现有会重建菜单的触发点：`create_tray` 初次构建、模式切换（`handle_mode_selection`）、截图新增（`NewScreenshotAdded`）、录制新增事件（`NewStudioRecordingAdded`，仅限实际发出该事件的路径）、权限变化（`permissions.rs:358/413`），以及启动后异步缩略图加载完成时的菜单重建。当前 `RecordingStarted` / `RecordingStopped` 监听只更新托盘图标，不重建菜单，因此不作为语言刷新保证。

每次 `build_tray_menu` 内调用 `tray_locale(app)` 重读 → 切语言后下次菜单重建自然生效。**不新增 Tauri command、不改前端**（用户已确认接受「下次刷新才更新」）。

## 四、验证

1. **编译**：`cargo check -p cap-desktop`（在 `apps/desktop/src-tauri` 下）通过；`TrayText` 全枚举 `match` 确保文案无遗漏。
2. **运行**（中文 Windows）：
   - 首启动（store 无 `i18n`）→ 系统回退 → 托盘显示中文。
   - 设置切 English（写入 store）→ 触发一次确定会重建菜单的操作（如切换模式或重启）→ 托盘变英文。
   - 切回中文 → 再次触发菜单重建 → 托盘变中文。
3. **回归**：托盘各项点击行为与切换语言前完全一致（MenuId 未变）。

## 五、范围边界

- **不动**：前端任何文件；事件/业务逻辑；`TrayItem` / MenuId；非显示文本。
- **不引入**：实时刷新 command、构建期字典同步、新的翻译框架。
- 主要改动 2 个文件：`apps/desktop/src-tauri/Cargo.toml`、`apps/desktop/src-tauri/src/tray.rs`。如 Cargo 更新直接依赖关系，则一并提交 `Cargo.lock` 中 `cap-desktop` 的 dependency 列表变更。
