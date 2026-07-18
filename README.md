# Only Us Room

一个只属于两个人的局域网小房间：聊天、发语音占位、视频通话占位，以及 30 分钟没人回复时自动出现的 Qwen 小冰人。

## 当前功能

- 同一个 Wi-Fi 下两个人打开同一个局域网地址，可以看到同步聊天。
- 支持文字消息和语音消息占位。
- 支持视频通话界面占位。
- 如果 30 分钟没有新的回复，小冰人会通过 Qwen 自动发一条陪伴消息。

## Prerequisites

- Node.js `>=22.13.0`
- 阿里云百炼 API Key，用于调用 Qwen 小冰人回复

## 安装依赖

```bash
npm install
```

## 配置 Qwen API Key

在项目根目录创建 `.env.local`：

```bash
touch .env.local
```

写入下面内容：

```env
DASHSCOPE_API_KEY=你的百炼 API Key
QWEN_MODEL=qwen3.6-flash
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

说明：

- `DASHSCOPE_API_KEY`：阿里云百炼 API Key，格式通常是 `sk-...`。
- `QWEN_MODEL`：要调用的模型，默认使用 `qwen3.6-flash`。
- `QWEN_BASE_URL`：阿里云百炼 OpenAI 兼容接口地址。
- `.env.local` 已经被 `.gitignore` 忽略，不要把真实 API Key 提交到仓库。

如果你使用华北 2（北京）或新加坡的业务空间专属域名，可以把 `QWEN_BASE_URL` 换成阿里云文档里的地址，例如：

```env
QWEN_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
```

把 `{WorkspaceId}` 替换成你的真实业务空间 ID。

## 本地启动

只看页面可以运行：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

## 局域网启动

局域网模式需要三个终端分别运行：

```bash
npm run dev
npm run lan:chat
npm run lan:proxy
```

查看本机局域网 IP：

```bash
ipconfig getifaddr en0
```

然后两个人在同一个 Wi-Fi 下打开：

```text
http://你的电脑局域网IP:8080
```

例如：

```text
http://192.168.3.76:8080
```

## 小冰人回复机制

聊天服务运行在 `npm run lan:chat` 中。当用户发出消息后，如果在等待时间内没有新消息，小冰人会读取两位用户从开始到现在的完整对话历史，并通过阿里云百炼的 OpenAI 兼容 Chat Completions 接口生成一条简短回复。

默认等待时间是 30 分钟。开发时可以临时缩短：

```bash
AUTO_REPLY_DELAY_MS=3000 npm run lan:chat
```

如果没有配置 `DASHSCOPE_API_KEY`，或者 Qwen 请求失败，服务会自动使用固定兜底文案，聊天本身不会中断。

## 双人同步开发

详细分工见 [docs/COLLABORATION.md](docs/COLLABORATION.md)。

推荐这样分：

- 一个人开 `design/ui-polish` 分支，负责 `app/page.tsx` 和 `app/globals.css`。
- 一个人开 `feature/xiaobingren-ai` 分支，负责 `scripts/lan-chat-server.mjs`。

每次提交前运行：

```bash
npm run build
```

## Useful Commands

- `npm run dev`: start local development
- `npm run lan:chat`: start the LAN message server
- `npm run lan:proxy`: expose the site and API on port `8080`
- `npm run build`: verify the vinext build output
- `npm run db:generate`: generate Drizzle migrations after schema changes
