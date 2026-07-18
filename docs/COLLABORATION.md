# 双人协作说明

这个项目适合两个人分工开发：

- A 负责网页样式和交互体验。
- B 负责小冰人的 AI 能力和消息服务。

## 推荐分支

```bash
git checkout -b design/ui-polish
git checkout -b feature/xiaobingren-ai
```

## A：网页样式方向

主要文件：

- `app/page.tsx`
- `app/globals.css`
- `app/layout.tsx`

建议只改界面、文案、按钮状态、布局和响应式样式。尽量不要改 `scripts/lan-chat-server.mjs`，这样不会和小冰人后端开发冲突。

## B：小冰人 AI 方向

主要文件：

- `scripts/lan-chat-server.mjs`
- 未来可以新增 `app/api/` 或服务端模块
- 未来可以新增 `.env.example` 来说明 AI API Key

建议先把小冰人的回复逻辑封装成函数，例如：

```js
async function generatePetReply({ latestMessage, messages }) {
  return "小冰人来陪你坐一会儿。TA 也许正在忙，等 TA 回来就会看到你的话。";
}
```

后面接 AI 时，只需要替换这个函数内部逻辑。

## 本地和局域网启动

这个网站局域网运行时需要三个进程：

```bash
npm run dev
npm run lan:chat
npm run lan:proxy
```

然后同一个 Wi-Fi 下的两个人打开：

```text
http://你的电脑局域网IP:8080
```

Mac 上查看局域网 IP：

```bash
ipconfig getifaddr en0
```

## 合并建议

- 每个人在自己的分支提交。
- 每次提交前运行 `npm run build`。
- 通过 Pull Request 合并到 `main`。
- 如果两个人都改了同一个文件，先保留能运行的版本，再手动合并对方的具体改动。
