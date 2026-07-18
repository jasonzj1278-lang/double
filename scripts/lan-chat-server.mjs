import http from "node:http";

const clients = new Set();
const petAuthorId = "little-ice-person";
const autoReplyDelay = Number(process.env.AUTO_REPLY_DELAY_MS) || 30 * 60 * 1000;
let petReplyTimer;
const messages = [
  {
    id: 1,
    authorId: "room",
    authorName: "房间",
    kind: "text",
    body: "欢迎回来。局域网模式已打开，同一个 Wi-Fi 下的两个人会看到同一段对话。",
    time: "21:08",
  },
];

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

function broadcast() {
  const payload = `data: ${JSON.stringify(messages)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function formatTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}

function schedulePetReply(message) {
  clearTimeout(petReplyTimer);
  petReplyTimer = setTimeout(() => {
    const latestMessage = messages.at(-1);
    if (latestMessage?.id !== message.id) return;

    messages.push({
      id: Date.now(),
      authorId: petAuthorId,
      authorName: "小冰人",
      kind: "pet",
      body: "小冰人来陪你坐一会儿。TA 也许正在忙，等 TA 回来就会看到你的话。",
      time: formatTime(),
    });
    broadcast();
  }, autoReplyDelay);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  if (req.url === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    });
    clients.add(res);
    res.write(`data: ${JSON.stringify(messages)}\n\n`);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.url === "/messages" && req.method === "POST") {
    try {
      const parsed = JSON.parse(await readBody(req));
      const body = String(parsed.body || "").trim();
      if (!body) return sendJson(res, 400, { error: "Message is empty" });

      messages.push({
        id: Date.now(),
        authorId: String(parsed.authorId || "unknown"),
        authorName: String(parsed.authorName || "我"),
        kind: parsed.kind === "voice" ? "voice" : "text",
        body,
        length: parsed.length,
        time: formatTime(),
      });

      broadcast();
      schedulePetReply(messages.at(-1));
      return sendJson(res, 201, { ok: true });
    } catch {
      return sendJson(res, 400, { error: "Invalid message" });
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(Number(process.env.CHAT_PORT) || 8081, "0.0.0.0", () => {
  console.log("LAN chat server is ready");
});
