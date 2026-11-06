# USB Player

一个纯本地的视频片库：**选一个文件夹 → 自动扫描所有视频 → 同名图片当封面 → 点击海报用 PotPlayer 播放**。

前端 React + TypeScript + Tailwind CSS，后台 Node.js + TypeScript（Express）。没有数据库、没有云同步、没有账号，所有数据都来自实时文件系统扫描。

## 为什么不需要数据库

| 数据 | 来源 | 是否持久化 |
| --- | --- | --- |
| 视频列表 / 大小 / 修改时间 | 每次打开文件夹时 `readdir` + `stat` 实时扫描 | 否，刷新即重建 |
| 封面 | 同目录下同主文件名的图片文件 | 否，文件本身就在磁盘上 |
| 播放 | 后台 `spawn` 调起本机 PotPlayer 进程 | 否，一次性动作 |
| 最近文件夹 / 播放器路径 / 视图偏好 | 浏览器 `localStorage` | 仅本机浏览器 |
| 后台状态 | 内存中的 `id → 绝对路径` 映射 | 否，进程退出即清空 |

后台完全无状态，不写任何配置文件或数据文件。所有面向浏览器的接口都只接受扫描时生成的短 id，不接受任意路径，避免本地服务被拿来读取无关文件。

## 快速开始

需要 Node.js 20+（推荐 22）和已安装的 PotPlayer。

```bash
npm install
npm run dev
```

打开 <http://localhost:5173>。

- 前端开发服务器：5173，自动把 `/api` 代理到后台
- 后台 API：3001（`PORT` 环境变量可改）

生产模式（构建前端，由后台单端口同时提供页面和 API）：

```bash
npm run preview      # 等价于 npm run build && npm start
```

打开 <http://localhost:3001>。

其他命令：`npm run typecheck`、`npm run build`、`npm run dev:server`、`npm run dev:web`。

## 使用方式

1. 点顶栏「打开文件夹」直接唤起 Windows 原生选择窗口（支持任意盘符和中文路径）。系统窗口不可用会自动回退到「打开文件夹」选择窗口；空状态下还有「手动浏览 / 粘贴路径」可手动浏览目录或粘贴绝对路径。
2. 后台递归扫描视频，自动匹配封面，结果以海报墙展示。
3. 点击海报唤起 PotPlayer 播放；卡片右下角的小图标可以在资源管理器中定位原文件。
4. 顶栏支持搜索（快捷键 `/`）、排序、按目录分组、网格/列表切换、重新扫描。

也可以让页面启动即打开指定文件夹，`folder` 为 URL 编码后的绝对路径（适合演示或存书签）：

```
http://localhost:5173/?folder=D%3A%5CMovies
```

### 封面匹配规则

```
Movies/阿凡达.mp4   →  Movies/阿凡达.jpg        ✅ 同名图片
Movies/阿凡达.mkv   →  Movies/阿凡达.png        ✅ 同名图片
Movies/阿凡达.mp4   →  Movies/阿凡达.mp4.jpg    ✅ 兼容刮削器命名
Movies/阿凡达.mp4   →  没有匹配                 → 内置默认封面 SVG
```

封面图片支持 `jpg / jpeg / png / webp / avif / jfif / bmp / gif`；同名有多种格式时按此优先级取用。视频支持 `mp4 / mkv / avi / mov / wmv / flv / webm / m4v / mpg / mpeg / ts / m2ts / rmvb / rm / vob / 3gp / asf / divx / f4v / ogv`。

### PotPlayer

后台启动时会依次查注册表、常见安装路径（`C:\Program Files\DAUM\PotPlayer\PotPlayerMini64.exe` 等）和 PATH。如果没有自动找到，点左下角「设置」手动填写 `PotPlayerMini64.exe` 的完整路径，可先点「校验」确认。

## 项目结构

```
.
├── package.json              # workspaces + 一键启动脚本
├── server/
│   └── src/
│       ├── index.ts          # Express 启动、静态托管、错误处理
│       ├── routes.ts         # 全部 /api 路由
│       ├── scanner.ts        # 目录扫描 + 同名封面匹配 + id 索引
│       ├── dialog.ts         # 系统原生文件夹选择对话框
│       ├── player.ts         # PotPlayer 探测 / 启动 / 定位文件
│       ├── store.ts          # 内存 id 索引
│       └── types.ts
└── web/
    ├── public/
    │   ├── default-cover.svg # 无封面时的默认海报
    │   └── favicon.svg
    └── src/
        ├── App.tsx           # 页面状态与交互
        ├── api.ts / types.ts / utils.ts
        └── components/       # 侧边栏、顶栏、海报卡片、文件夹选择器、设置、Toast
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查、支持的扩展名 |
| GET | `/api/fs/roots` | 磁盘列表与快捷位置 |
| GET | `/api/fs/browse?path=` | 浏览子目录（只返回目录名） |
| POST | `/api/fs/pick` | 唤起系统原生文件夹对话框 |
| POST | `/api/library/open` | `{ path, recursive }` 扫描并返回视频列表 |
| GET | `/api/cover/:id` | 封面图片流，无封面时返回兜底 SVG |
| GET | `/api/player/detect` | 探测 PotPlayer |
| POST | `/api/player/validate` | 校验自定义播放器路径 |
| POST | `/api/player/play` | `{ id, playerPath? }` 唤起播放 |
| POST | `/api/player/reveal` | 在文件管理器中定位视频 |

## 常见问题

- **系统选择窗口没弹出**：确认后台是在有桌面的会话里运行的（不是无界面服务/容器）；Windows 上依赖系统自带的 PowerShell。也可以改用弹窗内的目录浏览或直接粘贴路径。
- **提示没找到 PotPlayer**：在「设置」里手动指定 exe 路径；绿色状态表示可用。
- **扫描很久 / 数量不对**：默认递归、深度上限 12、单次最多 5000 个视频。可关闭「包含子文件夹」，或把媒体库拆小。
- **图片或视频没被识别**：检查扩展名是否在支持列表里；隐藏目录、系统目录、`node_modules` 等会被跳过。
- **端口冲突**：后台用 `PORT=4000 npm run dev:server` 启动时，需同步修改 `web/vite.config.ts` 里的代理目标。

> 本工具只监听本机端口供自己使用。若需要局域网访问，请注意 `/api/fs/*` 与播放接口不要暴露到不可信网络。
