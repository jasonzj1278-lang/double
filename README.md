# Only Us Room

一个只属于两个人的局域网小房间：聊天、发语音占位、视频通话占位，以及 30 分钟没人回复时自动出现的小冰人。

## 当前功能

- 同一个 Wi-Fi 下两个人打开同一个局域网地址，可以看到同步聊天。
- 支持文字消息和语音消息占位。
- 支持视频通话界面占位。
- 如果 30 分钟没有新的回复，小冰人会自动发一条陪伴消息。

## Prerequisites

- Node.js `>=22.13.0`

## 本地启动

```bash
npm install
npm run dev
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
