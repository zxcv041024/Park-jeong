"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { makeGeneratedSong, type GeneratedSong } from "@/lib/notes";
import { saveGeneratedSong } from "@/lib/storage";

export default function GeneratePage() {
  const [genre, setGenre] = useState("K-POP");
  const [difficulty, setDifficulty] = useState("초급");
  const [mood, setMood] = useState("Idol Ballad");
  const [length, setLength] = useState("8마디");
  const [song, setSong] = useState<GeneratedSong | null>(null);

  function generate() {
    const nextSong = makeGeneratedSong(genre, difficulty, mood, length);
    setSong(nextSong);
    saveGeneratedSong(nextSong);
  }

  return (
    <AppShell>
      <section className="grid gap-5 lg:grid-cols-[390px_1fr]">
        <div className="glass rounded-lg p-6">
          <Wand2 className="text-sky-300" size={38} />
          <h1 className="mt-5 text-4xl font-black">AI 악보 생성</h1>
          <p className="mt-3 leading-7 text-blue-100/68">장르, 난이도, 분위기, 길이를 선택하면 NoteEvent[] 기반의 Falling Notes 곡을 생성합니다.</p>
          <div className="mt-6 space-y-4">
            {[
              ["장르", genre, setGenre, ["K-POP", "재즈", "클래식", "발라드", "게임 음악"]],
              ["난이도", difficulty, setDifficulty, ["초급", "중급", "고급"]],
              ["분위기", mood, setMood, ["Idol Ballad", "Dance Piano Cover", "몽환적인 신스팝", "감성적인 훅"]],
              ["길이", length, setLength, ["4마디", "8마디", "16마디"]]
            ].map(([label, value, setter, options]) => (
              <label key={label as string} className="block">
                <span className="text-sm text-sky-100/74">{label as string}</span>
                <select value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-2 w-full rounded-md border border-sky-200/16 bg-slate-950/70 px-3 py-3 text-white">
                  {(options as string[]).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
            <button onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 font-black text-slate-950 hover:bg-sky-200">
              생성하기 <Wand2 size={17} />
            </button>
          </div>
        </div>
        <div className="glass rounded-lg p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200/70">Generated NoteEvent Score</p>
          {song ? (
            <div className="mt-5">
              <h2 className="text-3xl font-black">{song.title}</h2>
              <p className="mt-2 text-blue-100/68">{song.genre} · {song.difficulty} · {song.length} · {song.bpm} BPM</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {song.chords.map((chord) => <span key={chord} className="rounded-md bg-sky-300/14 px-3 py-2 text-sky-100">{chord}</span>)}
              </div>
              <div className="mt-5 h-28 overflow-hidden rounded-lg border border-sky-200/12 bg-slate-950/60 p-3">
                <div className="relative h-full">
                  {song.notes.slice(0, 18).map((note, index) => (
                    <div key={`${note.note}-${index}`} className="absolute bottom-0 rounded-sm bg-sky-300/80 text-[10px] font-bold text-slate-950" style={{ left: `${index * 5.5}%`, height: `${28 + note.duration * 34}px`, width: "4.5%" }}>{note.note}</div>
                  ))}
                </div>
              </div>
              <pre className="mt-5 max-h-72 overflow-auto rounded-lg border border-sky-200/12 bg-slate-950/70 p-4 text-sm text-blue-100/80">{JSON.stringify(song.notes.slice(0, 12), null, 2)}</pre>
              <Link href="/practice" className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-3 font-bold text-white hover:bg-blue-400">
                생성된 곡 연습하기 <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="mt-12 rounded-lg border border-dashed border-sky-200/20 p-10 text-center text-blue-100/64">생성 결과는 반드시 NoteEvent[]로 변환되어 /practice에서 바로 연습됩니다.</div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
