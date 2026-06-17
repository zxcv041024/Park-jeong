import { Award, Flame, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { dashboardRecords, leaderboard } from "@/lib/notes";

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-200/70">Learning Dashboard</p>
          <h1 className="mt-2 text-4xl font-black">학습 기록, AI 맞춤 커리큘럼, 랭킹</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="총 연습 시간" value="12.4h" detail="이번 달 누적" />
          <StatCard label="평균 정확도" value="86%" detail="최근 7일 기준" />
          <StatCard label="연속 학습일" value="6일" detail="배지까지 1일 남음" />
          <StatCard label="최고 콤보" value="18x" detail="Signature Demo" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="glass rounded-lg p-5">
            <h2 className="text-xl font-bold">최근 연습 기록</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-sky-200/12">
              <table className="w-full border-collapse text-left">
                <thead className="bg-sky-300/10 text-sm text-sky-100/72">
                  <tr><th className="p-3">곡</th><th className="p-3">정확도</th><th className="p-3">콤보</th><th className="p-3">점수</th><th className="p-3">날짜</th></tr>
                </thead>
                <tbody>
                  {dashboardRecords.map((row) => (
                    <tr key={row.song} className="border-t border-sky-200/10 text-blue-50/82">
                      <td className="p-3 font-semibold">{row.song}</td><td className="p-3">{row.accuracy}%</td><td className="p-3">{row.combo}x</td><td className="p-3">{row.score}</td><td className="p-3">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-5">
            <div className="glass rounded-lg p-5">
              <div className="flex items-center gap-2"><Trophy className="text-sky-300" /><h2 className="text-xl font-bold">친구 랭킹</h2></div>
              <div className="mt-4 space-y-2">
                {leaderboard.map((user, index) => (
                  <div key={user.name} className="flex items-center justify-between rounded-md bg-white/[0.055] p-3">
                    <div><p className="font-bold">{index + 1}. {user.name}</p><p className="text-xs text-blue-100/55">{user.badge}</p></div>
                    <p className="font-black text-sky-200">{user.score}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-lg p-5">
              <div className="flex items-center gap-2"><Flame className="text-sky-300" /><h2 className="text-xl font-bold">AI 추천 커리큘럼</h2></div>
              <ol className="mt-4 space-y-3 text-blue-100/72">
                <li className="rounded-md bg-white/[0.055] p-3">1. 왼손 독립성 루프 8분</li>
                <li className="rounded-md bg-white/[0.055] p-3">2. K-POP 초급 편곡 6분</li>
                <li className="rounded-md bg-white/[0.055] p-3">3. 변환 악보 실전 연습 2회</li>
              </ol>
            </div>
            <div className="glass rounded-lg p-5">
              <div className="flex items-center gap-2"><Award className="text-sky-300" /><h2 className="text-xl font-bold">배지 시스템</h2></div>
              <p className="mt-3 text-blue-100/68">오늘의 피아니스트 · 연속 학습왕 · 콤보 마스터 · 왼손 루키</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
