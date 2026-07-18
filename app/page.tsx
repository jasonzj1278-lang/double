"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PetMood = "happy" | "calm" | "sad" | "worried";

type Message = {
  id: number;
  authorId: string;
  authorName: string;
  kind: "text" | "voice" | "pet";
  body: string;
  time: string;
  length?: string;
};

const firstMessages: Message[] = [
  {
    id: 1,
    authorId: "room",
    authorName: "房间",
    kind: "text",
    body: "欢迎回来。局域网模式已打开，同一个 Wi-Fi 下的两个人会看到同一段对话。",
    time: "21:08",
  },
];

function getClientId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem("only-us-client-id");
  if (existing) return existing;
  const created =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `person-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem("only-us-client-id", created);
  return created;
}

function getApiBase() {
  return "/api";
}

const happyWords = [
  "爱",
  "喜欢",
  "开心",
  "哈哈",
  "想你",
  "抱抱",
  "宝贝",
  "谢谢",
  "好呀",
  "晚安",
];

const sadWords = ["难过", "哭", "委屈", "累", "不开心", "失望", "想哭"];

const fightWords = [
  "吵架",
  "生气",
  "讨厌",
  "烦",
  "滚",
  "别理我",
  "分手",
  "冷战",
  "算了",
];

function detectMood(messages: Message[], comfortLevel: number): PetMood {
  const recentText = messages
    .slice(-8)
    .map((message) => message.body)
    .join(" ");
  const text = recentText.toLowerCase();
  const hasFight = fightWords.some((word) => text.includes(word));
  const hasSad = sadWords.some((word) => text.includes(word));
  const hasHappy = happyWords.some((word) => text.includes(word));

  if (hasFight && comfortLevel < 2) return "worried";
  if ((hasFight || hasSad) && comfortLevel < 4) return "sad";
  if (hasHappy || comfortLevel > 4) return "happy";
  return "calm";
}

const petMoodCopy: Record<PetMood, { face: string; status: string; whisper: string }> = {
  happy: {
    face: "smile",
    status: "小冰人在笑",
    whisper: "你们的气氛暖暖的，它在旁边晃脚。",
  },
  calm: {
    face: "calm",
    status: "小冰人陪着你们",
    whisper: "它安静坐着，听你们慢慢说。",
  },
  sad: {
    face: "sad",
    status: "小冰人有点想哭",
    whisper: "它感觉到有人难过，想被轻轻摸一下。",
  },
  worried: {
    face: "cry",
    status: "小冰人哭了",
    whisper: "它听见吵架的味道了，正抱着小碗等你们和好。",
  },
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(firstMessages);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [sendError, setSendError] = useState("");
  const [comfortLevel, setComfortLevel] = useState(0);
  const [petNotice, setPetNotice] = useState("摸摸它，或者喂它一点甜甜的东西。");
  const [callState, setCallState] = useState<"idle" | "ringing" | "live">(
    "idle",
  );
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const clientId = useRef("");

  useEffect(() => {
    clientId.current = getClientId();
    const events = new EventSource(`${getApiBase()}/events`);

    events.onopen = () => setConnected(true);
    events.onerror = () => setConnected(false);
    events.onmessage = (event) => {
      const nextMessages = JSON.parse(event.data) as Message[];
      setMessages(nextMessages);
    };

    return () => events.close();
  }, []);

  const statusText = useMemo(() => {
    if (callState === "live") return "视频通话中";
    if (callState === "ringing") return "正在等待对方接听";
    return connected ? "局域网已连接" : "等待局域网连接";
  }, [callState, connected]);

  const petMood = useMemo(
    () => detectMood(messages, comfortLevel),
    [messages, comfortLevel],
  );
  const petCopy = petMoodCopy[petMood];

  function petTouch() {
    setComfortLevel((level) => Math.min(level + 2, 8));
    setPetNotice("小冰人被摸摸了，脸颊变得亮晶晶。");
  }

  function feedPet() {
    setComfortLevel((level) => Math.min(level + 3, 8));
    setPetNotice("小冰人吃到了一口冰糖，开心地眯起眼睛。");
  }

  async function postMessage(message: Omit<Message, "id" | "time">) {
    const response = await fetch(`${getApiBase()}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error("消息未能送达");
  }

  async function sendMessage() {
    const clean = draft.trim();
    if (!clean) return;

    try {
      setSendError("");
      await postMessage({
        authorId: clientId.current,
        authorName: "我",
        kind: "text",
        body: clean,
      });
      setDraft("");
    } catch {
      setSendError("消息没有送达，请确认两人都打开局域网链接。");
    }
  }

  async function addVoiceNote() {
    try {
      setSendError("");
      await postMessage({
        authorId: clientId.current,
        authorName: "我",
        kind: "voice",
        body: "新的语音消息",
        length: "0:12",
      });
    } catch {
      setSendError("语音没有送达，请确认两人都打开局域网链接。");
    }
  }

  return (
    <main className="app-shell">
      <section className="private-room" aria-label="你们的专属房间">
        <div className="room-topline">
          <span>Only two hearts allowed</span>
          <strong>{statusText}</strong>
        </div>

        <div className="room-hero">
          <div>
            <p className="eyebrow">双人私密空间</p>
            <h1>一个只属于你和那个人的网站</h1>
            <p className="hero-copy">
              打开就是你们的房间：聊天、发语音、开视频。没有广场，没有动态，
              只有此刻在线的彼此。
            </p>
          </div>

          <div className="identity-lock" aria-hidden="true">
            <div className="orbit one" />
            <div className="orbit two" />
            <span>2</span>
          </div>
        </div>

        <div className={`pet-panel mood-${petMood}`} aria-label="小冰人宠物">
          <div className="pet-stage">
            <button className="pet-body" onClick={petTouch} aria-label="摸摸小冰人">
              <span className="pet-shine" />
              <span className="pet-face" data-face={petCopy.face}>
                <i />
                <i />
                <b />
              </span>
              <span className="pet-tear left" />
              <span className="pet-tear right" />
            </button>
            <div className="pet-shadow" />
          </div>
          <div className="pet-info">
            <div>
              <strong>{petCopy.status}</strong>
              <small>{petCopy.whisper}</small>
            </div>
            <p>{petNotice}</p>
            <div className="pet-actions">
              <button onClick={petTouch}>摸摸</button>
              <button onClick={feedPet}>喂冰糖</button>
            </div>
          </div>
        </div>

        <div className="presence-panel">
          <div className="person">
            <span className="avatar mine">我</span>
            <div>
              <strong>你</strong>
              <small>准备说话</small>
            </div>
          </div>
          <div className="connection-line" />
          <div className="person">
            <span className="avatar theirs">TA</span>
            <div>
              <strong>那个人</strong>
              <small>正在房间里</small>
            </div>
          </div>
        </div>

        <div className="call-actions">
          <button
            className="primary-action"
            onClick={() =>
              setCallState((current) =>
                current === "live" ? "idle" : current === "ringing" ? "live" : "ringing",
              )
            }
          >
            {callState === "live"
              ? "结束通话"
              : callState === "ringing"
                ? "模拟接通"
                : "发起视频"}
          </button>
          <button onClick={() => setMuted((value) => !value)}>
            {muted ? "打开麦克风" : "静音"}
          </button>
          <button onClick={() => setCameraOff((value) => !value)}>
            {cameraOff ? "打开镜头" : "关闭镜头"}
          </button>
        </div>
      </section>

      <section className="conversation" aria-label="聊天窗口">
        <div className="video-stage">
          <div className="video-pane large">
            <div className="soft-noise" />
            <span>{cameraOff ? "你的镜头已关闭" : "你的视频"}</span>
          </div>
          <div className="video-pane small">
            <span>TA</span>
          </div>
          {callState !== "idle" && (
            <div className="call-badge">
              <span className="pulse" />
              {callState === "live" ? "已连接" : "呼叫中"}
            </div>
          )}
        </div>

        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <strong>今晚的对话</strong>
              <small>端到端加密可以在后端版本接入</small>
            </div>
            <span>{messages.length} 条</span>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`message ${
                  message.authorId === "little-ice-person"
                    ? "from-pet"
                    : message.authorId === clientId.current
                      ? "from-me"
                      : "from-you"
                }`}
                key={message.id}
              >
                {message.kind === "pet" && <small className="pet-name">小冰人</small>}
                {message.kind === "voice" ? (
                  <div className="voice-message">
                    <button aria-label="播放语音">▶</button>
                    <div className="voice-wave">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <b>{message.length}</b>
                  </div>
                ) : (
                  <p>{message.body}</p>
                )}
                <time>{message.time}</time>
              </article>
            ))}
          </div>

          <div className="composer">
            <button className="icon-button" onClick={addVoiceNote} aria-label="录制语音">
              录
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="写给 TA..."
              aria-label="输入消息"
            />
            <button className="send-button" onClick={sendMessage}>
              发送
            </button>
          </div>
          {sendError && <p className="send-error" role="alert">{sendError}</p>}
        </div>
      </section>
    </main>
  );
}
