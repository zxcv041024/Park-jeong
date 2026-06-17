import Link from "next/link";
import { Brain, Gauge, LayoutDashboard, Link2, Music2, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const menuItems = [
  {
    href: "/learn",
    title: "Learn",
    subtitle: "단계별 피아노 학습",
    icon: Gauge
  },
  {
    href: "/practice",
    title: "Practice",
    subtitle: "Falling Notes 연습",
    icon: Music2
  },
  {
    href: "/generate",
    title: "Generate",
    subtitle: "AI 악보 생성",
    icon: Wand2
  },
  {
    href: "/convert",
    title: "Convert",
    subtitle: "유튜브/음원 악보 변환",
    icon: Link2
  },
  {
    href: "/ai-coach",
    title: "AI Coach",
    subtitle: "AI 피아노 선생님",
    icon: Brain
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    subtitle: "기록, 랭킹, 커리큘럼",
    icon: LayoutDashboard
  }
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="flex flex-1 flex-col py-6">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">Simply Piano + Generative AI</p>
          <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-7xl">
            MAFIA
            <span className="block text-2xl font-semibold text-sky-200 sm:text-3xl">마음만은 피아니스트</span>
          </h1>
          <p className="mt-5 max-w-3xl text-2xl font-semibold leading-snug text-blue-50">
            Simply Piano가 채점 앱이라면, MAFIA는 AI 개인 피아노 선생님입니다.
          </p>
        </div>

        <div className="grid flex-1 place-items-center py-10">
          <div className="grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="glass group rounded-lg p-6 transition duration-200 hover:-translate-y-1 hover:border-sky-200/38 hover:bg-sky-300/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-md bg-sky-300 text-slate-950 shadow-glow transition group-hover:scale-105">
                    <item.icon size={28} />
                  </div>
                  <span className="rounded-md border border-sky-200/14 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-100/70">
                    Open
                  </span>
                </div>
                <h2 className="mt-6 text-3xl font-black text-white">{item.title}</h2>
                <p className="mt-2 text-lg text-blue-100/66">{item.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
