<p align="center">
	<img width="150" height="150" src="https://github.com/CapSoftware/Cap/blob/main/apps/desktop/src-tauri/icons/Square310x310Logo.png" alt="Cap logo">
</p>

<h1 align="center">Cap</h1>

<p align="center">
	美观、可分享的屏幕录制工具。开源、快速，为希望掌控自身数据的团队而生。
</p>

<p align="center">
	<a href="https://cap.so">官网</a>
	 |
	<a href="https://cap.so/download">下载</a>
	 |
	<a href="https://cap.so/docs">文档</a>
	 |
	<a href="https://cap.so/pricing">定价</a>
	 |
	<a href="https://cap.link/discord">Discord</a>
</p>

<p align="center">
	<a href="https://console.algora.io/org/CapSoftware/bounties?status=open">
		<img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fconsole.algora.io%2Fapi%2Fshields%2FCapSoftware%2Fbounties%3Fstatus%3Dopen" alt="开放赏金">
	</a>
</p>

<img src="https://raw.githubusercontent.com/CapSoftware/Cap/refs/heads/main/apps/web/public/landing-cover.png" alt="Cap 应用预览">

Cap 是 Loom 的开源替代方案。提供快速屏幕录制、精细的本地编辑、即时分享链接、评论、字幕、分析、团队工作区、自定义域名、自定义 S3 存储以及需要完全控制时的完整自托管能力。

适用于产品演示、缺陷报告、入职培训、教程、设计评审、工程演示、异步站会、客户更新，以及任何"展示成果比再约一次会议更快"的场景。

## 为什么选择 Cap

- **录制、编辑、分享。** 捕获屏幕、摄像头和麦克风，然后分享链接或导出成品视频。
- **即时模式，追求速度。** 录制同时上传，停止录制即刻获得可分享链接。
- **工作室模式，追求品质。** 本地录制，使用背景、缩放、裁剪、字幕和导出控制进行编辑。
- **为团队打造的桌面应用。** Cap 支持 macOS 和 Windows，同时提供用于查看、分享和管理录制的 Web 仪表板。
- **掌控存储。** 使用 Cap 云端、接入你自己的 S3 兼容存储桶、将录制保留在本地，或自托管整个平台。
- **隐私优先。** 公开或私密分享、添加密码、使用自定义域名，或将敏感录制远离托管基础设施。
- **异步协作。** 评论、表情回应、字幕、观众分析和团队工作区，让反馈与视频紧密关联。
- **Cap AI。** 自动生成标题、摘要、可点击章节、字幕和文本记录。
- **从 Loom 迁移。** 将现有 Loom 视频导入 Cap，将你的视频库集中管理。

## 录制模式

| 模式 | 适用场景 | 工作方式 |
| --- | --- | --- |
| 即时模式 | 快速反馈、缺陷报告、异步更新 | Cap 在录制时同步上传，录制停止后立即生成分享链接。 |
| 工作室模式 | 产品演示、教程、发布、客户交付 | Cap 本地录制，打开编辑器，让你导出或分享一个精修视频。 |

## 数据所有权

Cap 专为不希望录制工作流被锁定在黑箱中的人和团队设计。

- 使用 Cap 云端获得最快的托管体验。
- 接入 AWS S3、Cloudflare R2、Backblaze B2、MinIO、Wasabi 或其他 S3 兼容提供商。
- 从你的自定义域名提供分享页面。
- 使用 Docker Compose 自托管 Cap Web、API、数据库、媒体服务器和对象存储。
- 在桌面应用的 `设置 > Cap 服务器地址` 中指向你的自托管实例。

## 快速开始

对于大多数用户，最快的路径是：

1. 从 [cap.so/download](https://cap.so/download) 下载 Cap 的 macOS 或 Windows 版本。
2. 登录或创建账户。
3. 选择即时模式或工作室模式。
4. 录制你的第一段视频。
5. 分享链接、导出文件或保留在本地。

完整产品文档位于 [cap.so/docs](https://cap.so/docs)。

## 自托管

使用 Docker Compose 自托管 Cap Web 的最快方式：

```bash
git clone https://github.com/CapSoftware/Cap.git
cd Cap
docker compose up -d
```

Cap 将在 `http://localhost:3000` 可用。

未配置邮箱时，登录链接会出现在服务日志中：

```bash
docker compose logs cap-web
```

### 部署选项

| 方式 | 适用场景 |
| --- | --- |
| Docker Compose | VPS、家庭服务器以及任何支持 Docker 的主机 |
| [Railway](https://railway.com/new/template/PwpGcf) | 一键托管部署 |
| Coolify | 使用 `docker-compose.coolify.yml` 的自托管 PaaS 部署 |

[![一键部署到 Railway](https://railway.com/button.svg)](https://railway.com/new/template/PwpGcf)

生产环境中，在将部署暴露到互联网之前，请配置公开 URL 并替换默认密钥：

```bash
CAP_URL=https://cap.yourdomain.com
S3_PUBLIC_URL=https://s3.yourdomain.com
```

详见[自托管指南](https://cap.so/docs/self-hosting)，包含邮箱设置、AI 提供商、SSL、存储、生产加固和故障排除。

## 本地开发

Cap 是一个 Turborepo 单体仓库，包含 Rust、TypeScript、Tauri、SolidStart、Next.js、Drizzle、MySQL、Tailwind CSS 和共享媒体 crates。

环境要求：

- Node.js 20 或更新版本
- pnpm 10.5.2
- Rust 1.88 或更新版本
- Docker（用于 MySQL、MinIO 和本地服务）

安装和设置仓库：

```bash
pnpm install
pnpm env-setup
pnpm cap-setup
```

常用命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动完整的本地开发环境 |
| `pnpm dev:web` | 仅启动 Web 应用（不启动桌面应用） |
| `pnpm dev:desktop` | 启动桌面应用 |
| `pnpm build` | 构建工作区 |
| `pnpm tauri:build` | 构建桌面发行版 |
| `pnpm lint` | 运行 Biome 代码检查 |
| `pnpm format` | 使用 Biome 格式化 |
| `pnpm typecheck` | 运行 TypeScript 项目引用检查 |
| `cargo test -p <crate>` | 运行指定 crate 的 Rust 测试 |

数据库命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm db:generate` | 生成数据库产物 |
| `pnpm db:push` | 推送 schema 变更 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `apps/desktop` | 基于 Tauri v2 的桌面应用，使用 SolidStart UI 和 Rust 后端 |
| `apps/web` | Next.js Web 应用，服务于营销、文档、仪表板、分享、API 路由和认证 |
| `apps/cli` | Rust 命令行工具 |
| `apps/media-server` | Web 应用使用的媒体处理服务 |
| `apps/discord-bot` | Discord 集成 |
| `packages/database` | Drizzle schema 和数据库访问层 |
| `packages/ui` | 共享 React UI |
| `packages/ui-solid` | 共享 Solid UI |
| `packages/web-backend` | 后端服务层 |
| `packages/web-domain` | Web 领域模型和类型 |
| `packages/env` | 环境变量校验 |
| `packages/sdk-embed` | 嵌入 SDK |
| `packages/sdk-recorder` | 录制 SDK |
| `crates/*` | 录制、捕获、摄像头、音频、编码、渲染、封装、导出和测试 crates |
| `scripts/*` | 设置、分析、构建和维护工具 |
| `infra/*` | 基础设施配置 |

Web API 使用 Effect 和 `@effect/platform` HTTP API。桌面端的捕获和导出路径由 Rust crates 驱动，提供快速的录制、渲染和平台特定的媒体访问。

## 数据分析

Cap 使用 [Tinybird](https://www.tinybird.co) 提供观众遥测仪表板。在运行分析命令之前，请设置 `TINYBIRD_ADMIN_TOKEN` 或 `TINYBIRD_TOKEN`。

| 命令 | 用途 |
| --- | --- |
| `pnpm analytics:setup` | 从 `scripts/analytics/tinybird` 部署 Tinybird 数据源和数据管道 |
| `pnpm analytics:check` | 验证 Tinybird 工作区与应用预期一致 |

`analytics:setup` 可能删除不在仓库中分析配置内的 Tinybird 资源。请仅在你要管理的目标工作区上使用此命令。

## 参与贡献

Cap 采用公开构建方式。欢迎提交 Issue、Pull Request、设计反馈、缺陷报告、文档修复和认领赏金。

- 提交 Pull Request 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 在 [Discord](https://cap.link/discord) 加入社区。
- 在 [Algora](https://console.algora.io/org/CapSoftware/bounties?status=open) 查看开放赏金。

## 许可证

本软件的部分内容按以下方式授权：

- `cap-camera*` 和 `scap-*` crate 系列中的代码采用 MIT 许可证授权。详见 [licenses/LICENSE-MIT](https://github.com/CapSoftware/Cap/blob/main/licenses/LICENSE-MIT)。
- 第三方组件采用其所有者提供的原始许可证。
- 上述未提及的所有其他内容采用 [LICENSE](https://github.com/CapSoftware/Cap/blob/main/LICENSE) 中定义的 AGPLv3 许可证。
