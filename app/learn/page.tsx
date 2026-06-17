import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Lock, Music2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const curriculum = [
  {
    level: "초급",
    description: "악보를 몰라도 피아노 위치와 리듬을 익히는 단계",
    steps: [
      { title: "1. 건반 이름 익히기", detail: "C3-B5 위치, 흰 건반/검은 건반 구분", status: "done" },
      { title: "2. 한 음씩 따라 치기", detail: "초록색 건반을 보고 단일 음 인식 연습", status: "done" },
      { title: "3. Falling Notes 입문", detail: "맨 밑 막대와 건반 위치를 맞춰 치기", status: "current" },
      { title: "4. 4마디 멜로디", detail: "E-A-B-G-C 순서의 짧은 멜로디 완주", status: "open" }
    ]
  },
  {
    level: "중급",
    description: "양손 패턴과 코드 진행을 함께 익히는 단계",
    steps: [
      { title: "1. 왼손 베이스 루프", detail: "C3-G3-A3-F3 반복 패턴", status: "open" },
      { title: "2. 오른손 멜로디 연결", detail: "G4-C5 도약과 손 위치 이동", status: "open" },
      { title: "3. K-POP 코드 진행", detail: "C-G-Am-F 진행을 피아노 롤로 연습", status: "open" },
      { title: "4. 양손 동시 입력", detail: "같은 타이밍의 여러 NoteEvent 처리", status: "locked" }
    ]
  },
  {
    level: "고급",
    description: "표현, 속도, 변환 악보를 다루는 단계",
    steps: [
      { title: "1. 8마디 완주", detail: "실수 없이 전체 루프 연주", status: "locked" },
      { title: "2. 악보 업로드 연습", detail: "내 악보를 첨부하고 AI 변환 흐름으로 연습", status: "locked" },
      { title: "3. 음원 변환 곡", detail: "유튜브/음원 기반 mock 악보 연습", status: "locked" },
      { title: "4. 데모데이 챌린지", detail: "정확도 90%, 콤보 20 달성", status: "locked" }
    ]
  }
];

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="text-sky-300" size={20} />;
  if (status === "locked") return <Lock className="text-blue-100/35" size={18} />;
  return <Circle className={status === "current" ? "text-lime-300" : "text-blue-100/45"} size={18} />;
}

export default function LearnPage() {
  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="glass rounded-lg p-6">
          <Music2 className="text-sky-300" size={40} />
          <h1 className="mt-5 text-4xl font-black">단계별 커리큘럼</h1>
          <p className="mt-4 leading-8 text-blue-100/70">
            초급 다음에 무엇을 해야 하는지, 중급 다음에는 어떤 연습으로 넘어가는지 한눈에 보이도록 구성했습니다.
          </p>
          <div className="mt-6 rounded-lg border border-sky-200/14 bg-sky-300/10 p-4">
            <p className="text-sm font-bold text-sky-100">현재 추천 단계</p>
            <p className="mt-2 text-blue-100/68">초급 3단계 · Falling Notes 입문</p>
            <Link href="/practice" className="mt-4 inline-flex items-center gap-2 rounded-md bg-sky-300 px-4 py-2 text-sm font-black text-slate-950">
              바로 연습하기 <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          {curriculum.map((group) => (
            <div key={group.level} className="glass rounded-lg p-5">
              <div className="flex flex-col gap-2 border-b border-sky-200/10 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200/65">{group.level}</p>
                  <h2 className="mt-1 text-3xl font-black">{group.level} 과정</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-blue-100/62">{group.description}</p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {group.steps.map((step) => (
                  <div
                    key={step.title}
                    className={`rounded-lg border p-4 ${
                      step.status === "current"
                        ? "border-lime-300/50 bg-lime-300/10"
                        : step.status === "locked"
                          ? "border-white/8 bg-white/[0.025] opacity-70"
                          : "border-sky-200/12 bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon status={step.status} />
                      <div>
                        <h3 className="font-bold text-white">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-blue-100/64">{step.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
