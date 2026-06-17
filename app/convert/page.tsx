"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Link2, Loader2, Music2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { makeConvertedSong, type GeneratedSong } from "@/lib/notes";
import { saveGeneratedSong } from "@/lib/storage";

export default function ConvertPage() {
  const [url, setUrl] = useState("https://youtube.com/watch?v=demo");
  const [isLoading, setIsLoading] = useState(false);
  const [song, setSong] = useState<GeneratedSong | null>(null);

  function convert() {
    setIsLoading(true);
    window.setTimeout(() => {
      const nextSong = makeConvertedSong(url);
      setSong(nextSong);
      saveGeneratedSong(nextSong);
      setIsLoading(false);
    }, 900);
  }

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[430px_1fr]">
        <div className="glass rounded-lg p-6">
          <Link2 className="text-sky-300" size={38} />
          <h1 className="mt-5 text-4xl font-black">유튜브/음원 → 악보 변환</h1>
          <p className="mt-4 leading-8 text-blue-100/70">
            실제 다운로드는 하지 않고, URL 분석 → 코드 진행 추출 → 멜로디 추출 → Falling Notes 생성처럼 보이는 데모 흐름입니다.
          </p>
          <label className="mt-6 block">
            <span className="text-sm text-sky-100/74">YouTube 또는 음원 URL</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 w-full rounded-md border border-sky-200/16 bg-slate-950/70 px-3 py-3 text-white" />
          </label>
          <button onClick={convert} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 font-black text-slate-950 hover:bg-sky-200">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Music2 size={18} />}
            AI가 음원을 분석 중입니다
          </button>
        </div>

        <div className="glass rounded-lg p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200/70">Mock Conversion Result</p>
          {song ? (
            <div className="mt-5">
              <h2 className="text-3xl font-black">{song.title}</h2>
              <p className="mt-2 text-blue-100/68">{song.bpm} BPM · 초급 버전으로 변환 · {song.notes.length}개 NoteEvent</p>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {song.chords.map((chord) => <div key={chord} className="rounded-md bg-sky-300/12 p-3 text-center font-black text-sky-100">{chord}</div>)}
              </div>
              <pre className="mt-5 max-h-80 overflow-auto rounded-lg border border-sky-200/12 bg-slate-950/70 p-4 text-sm text-blue-100/80">{JSON.stringify(song.notes.slice(0, 10), null, 2)}</pre>
              <Link href="/practice" className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-3 font-bold text-white hover:bg-blue-400">
                변환된 곡 연습하기 <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="mt-10 rounded-lg border border-dashed border-sky-200/20 p-10 text-center text-blue-100/64">
              URL을 입력하면 악보 변환 결과와 Falling Notes 미리보기가 표시됩니다.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
