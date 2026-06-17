import Link from "next/link";
import { Brain, Gauge, LayoutDashboard, Music2, PenLine, Sparkles, Wand2 } from "lucide-react";

const navItems = [
  { href: "/home", label: "Home", icon: Sparkles },
  { href: "/learn", label: "Learn", icon: Gauge },
  { href: "/practice", label: "Practice", icon: Music2 },
  { href: "/generate", label: "Generate", icon: PenLine },
  { href: "/convert", label: "Convert", icon: Wand2 },
  { href: "/ai-coach", label: "AI Coach", icon: Brain },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-2 py-4 sm:px-4 lg:px-5">
        <nav className="glass sticky top-4 z-30 mb-5 flex items-center justify-between rounded-lg px-4 py-3">
          <Link href="/home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-300 text-slate-950 shadow-glow">
              <Music2 size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-sky-200">MAFIA</p>
              <p className="text-xs text-blue-100/70">마음만은 피아니스트</p>
            </div>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-100/76 transition hover:bg-sky-300/12 hover:text-white"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}
