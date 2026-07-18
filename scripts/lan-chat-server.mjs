import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clients = new Set();
const petAuthorId = "little-ice-person";
const autoReplyDelay = Number(process.env.AUTO_REPLY_DELAY_MS) || 30 * 60 * 1000;
const fallbackPetReply =
  "小冰人来陪你坐一会儿。TA 也许正在忙，等 TA 回来就会看到你的话。";
const petMentionPattern = /@\s*小冰人/;
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

loadLocalEnv();

const qwenApiKey = readApiKey();
const qwenBaseUrls = getQwenBaseUrls();
const qwenModel = process.env.QWEN_MODEL || "qwen3.6-flash";
const qwenTimeoutMs = Number(process.env.QWEN_TIMEOUT_MS) || 15000;

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), filename), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]] !== undefined) continue;

        const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
        process.env[match[1]] = value;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Could not load ${filename}: ${error.message}`);
      }
    }
  }
}

function readApiKey() {
  if (process.env.DASHSCOPE_API_KEY) return process.env.DASHSCOPE_API_KEY.trim();

  const keyFile =
    process.env.DASHSCOPE_API_KEY_FILE ||
    "/Users/maoyumizhang/Downloads/qwen_3.6_flash_api_key.txt";

  try {
    return readFileSync(keyFile, "utf8").trim();
  } catch {
    return "";
  }
}

function getQwenBaseUrls() {
  const configured = process.env.QWEN_BASE_URLS || process.env.QWEN_BASE_URL;
  if (configured) {
    return configured
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  return [
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
  ];
}

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

function getConversationHistory() {
  return messages
    .filter((message) => message.authorId !== "room")
    .map((message) => ({
      role: message.authorId === petAuthorId ? "assistant" : "user",
      content:
        message.kind === "voice"
          ? `${message.authorName} 发来一条 ${message.length || ""} 的语音消息。`
          : `${message.authorName}: ${message.body}`,
    }));
}

function normalizePetReply(reply, maxLength) {
  const clean = String(reply || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const chars = Array.from(clean || fallbackPetReply);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}...` : chars.join("");
}

async function createPetReply(mode = "comfort") {
  if (!qwenApiKey) return fallbackPetReply;

  let lastError;
  for (const baseUrl of qwenBaseUrls) {
    try {
      const reply = await requestPetReply(baseUrl, mode);
      return normalizePetReply(reply, mode === "mention" ? 80 : 40);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Qwen request failed");
}

async function requestPetReply(baseUrl, mode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), qwenTimeoutMs);
  const systemPrompt =
    mode === "mention"
      ? "你是双人私密聊天室里的“小冰人”，一个温柔、有点害羞的橙子小宠物。用户在聊天里 @ 你时，你要直接回应他们，可以接话、安慰、撒娇或轻轻调停气氛。不要假装是对方本人，不要承诺现实行动，中文回复最多 80 个字。"
      : "你是双人私密聊天室里的“小冰人”。你需要参考两位用户从开始到现在的所有对话，再判断此刻该如何陪伴。当其中一个人发消息后对方暂时没有回复，你要用温柔、克制、简短的中文陪伴一下。不要假装是对方本人，不要承诺现实行动，最多 40 个字。";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${qwenApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: qwenModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...getConversationHistory(),
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen request failed with ${response.status}`);
    }

    const completion = await response.json();
    return completion.choices?.[0]?.message?.content?.trim() || fallbackPetReply;
  } finally {
    clearTimeout(timeout);
  }
}

function pushPetReply(body) {
  messages.push({
    id: Date.now(),
    authorId: petAuthorId,
    authorName: "小冰人",
    kind: "pet",
    body,
    time: formatTime(),
  });
  broadcast();
}

async function replyToPetMention(message) {
  clearTimeout(petReplyTimer);
  const latestMessage = messages.at(-1);
  if (latestMessage?.id !== message.id) return;

  try {
    pushPetReply(await createPetReply("mention"));
  } catch (error) {
    console.warn(`Qwen mention reply failed: ${error.message}`);
    pushPetReply(fallbackPetReply);
  }
}

function schedulePetReply(message) {
  clearTimeout(petReplyTimer);
  petReplyTimer = setTimeout(async () => {
    const latestMessage = messages.at(-1);
    if (latestMessage?.id !== message.id) return;

    try {
      pushPetReply(await createPetReply());
    } catch (error) {
      console.warn(`Qwen pet reply failed: ${error.message}`);
      pushPetReply(fallbackPetReply);
    }
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
      const nextMessage = messages.at(-1);
      if (petMentionPattern.test(body)) {
        replyToPetMention(nextMessage);
      } else {
        schedulePetReply(nextMessage);
      }
      return sendJson(res, 201, { ok: true });
    } catch {
      return sendJson(res, 400, { error: "Invalid message" });
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(Number(process.env.CHAT_PORT) || 8081, "0.0.0.0", () => {
  console.log(`LAN chat server is ready with ${qwenApiKey ? qwenModel : "fallback"} replies`);
});
