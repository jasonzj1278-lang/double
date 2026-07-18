"use client";

import { useMemo, useState } from "react";

type Message = {
  id: number;
  from: "me" | "you";
  kind: "text" | "voice";
  body: string;
  time: string;
  length?: string;
};

const firstMessages: Message[] = [
  {
    id: 1,
    from: "you",
    kind: "text",
    body: "我刚刚进来了，这里真的只有我们两个。",
    time: "21:08",
  },
  {
    id: 2,
    from: "me",
    kind: "voice",
    body: "今天想听你慢慢讲。",
    time: "21:10",
    length: "0:18",
  },
  {
    id: 3,
    from: "you",
    kind: "text",
    body: "那我们把这里当成一个小房间吧。",
    time: "21:12",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(firstMessages);
  const [draft, setDraft] = useState("");
  const [callState, setCallState] = useState<"idle" | "ringing" | "live">(
    "idle",
  );
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const statusText = useMemo(() => {
    if (callState === "live") return "视频通话中";
    if (callState === "ringing") return "正在等待对方接听";
    return "今晚在线";
  }, [callState]);

  function sendMessage() {
    const clean = draft.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        from: "me",
        kind: "text",
        body: clean,
        time: new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      },
    ]);
    setDraft("");
  }

  function addVoiceNote() {
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        from: "me",
        kind: "voice",
        body: "新的语音消息",
        time: new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
        length: "0:12",
      },
    ]);
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
                className={`message ${message.from === "me" ? "from-me" : "from-you"}`}
                key={message.id}
              >
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
        </div>
      </section>
    </main>
  );
}
