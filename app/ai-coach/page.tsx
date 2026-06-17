"use client";

import { useState } from "react";
import { Brain, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const insights = [
  "왼손 박자가 조금 늦어요.",
  "3번째 마디에서 같은 실수가 반복되고 있어요.",
  "손가락을 더 부드럽게 이동하면 좋아요.",
  "오늘은 왼손 독립성 연습을 추천해요.",
  "C4에서 G4로 이동할 때 손 위치가 흔들리고 있어요.",
  "박자는 안정적이지만 긴 음을 끝까지 유지하는 연습이 필요해요."
];

export default function AICoachPage() {
  const [messages, setMessages] = useState([
    { role: "coach", text: "오늘 연습 결과를 분석했어요. 가장 큰 개선 포인트는 왼손 진입 타이밍입니다." },
    { role: "user", text: "다음에는 뭘 연습하면 좋아?" },
    { role: "coach", text: "76 BPM에서 C3-G3 베이스를 8분 반복하고, 마지막에 전체 곡을 2회 연주해보세요." }
  ]);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "coach", text: "mock AI 응답: 방금 질문 기준으로 왼손 독립성과 G4-C5 이동 루틴을 추천합니다." }
    ]);
    setInput("");
  }

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="glass rounded-lg p-6">
            <Brain className="text-sky-300" size={40} />
            <h1 className="mt-5 text-4xl font-black">AI 피아노 선생님</h1>
            <p className="mt-4 leading-8 text-blue-100/70">연주가 끝나면 AI 코치가 결과를 분석하고 다음 연습 루틴을 추천합니다. 실제 API 연결 전 mock 응답 구조입니다.</p>
          </div>
          <div className="glass rounded-lg p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200/70">약점 분석 카드</p>
            <div className="mt-4 space-y-2">
              {insights.slice(0, 4).map((item) => <div key={item} className="rounded-md bg-white/[0.055] p-3 text-sm text-blue-50/78">{item}</div>)}
            </div>
          </div>
        </div>

        <div className="glass flex min-h-[650px] flex-col rounded-lg">
          <div className="border-b border-sky-200/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-sky-300 text-slate-950"><Sparkles size={22} /></div>
              <div>
                <h2 className="text-2xl font-black">Coach Chat</h2>
                <p className="text-sm text-blue-100/58">OpenAI API 연결을 고려한 채팅형 UI</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-5">
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[78%] rounded-lg p-4 ${message.role === "coach" ? "bg-sky-300/12 text-blue-50" : "ml-auto bg-blue-500 text-white"}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="flex gap-3 border-t border-sky-200/10 p-5">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="AI 선생님에게 질문하기" className="min-w-0 flex-1 rounded-md border border-sky-200/16 bg-slate-950/70 px-4 py-3 text-white" />
            <button onClick={send} className="rounded-md bg-sky-300 px-4 py-3 font-black text-slate-950"><Send size={18} /></button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
