"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, Brain, FileMusic, Gauge, Mic, MicOff, RotateCcw, Sparkles, Trophy, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoNotes, noteToFrequency, pianoKeys, whiteKeys, type GeneratedSong } from "@/lib/notes";
import { loadGeneratedSong } from "@/lib/storage";

type Judgement = "Perfect" | "Miss";
type HitEvent = { id: number; note: string; judgement: Judgement };
type PitchResult = { frequency: number; clarity: number; rms: number };

const rollHeight = 520;
const currentBarBottom = 0;
const previewTops = [392, 318, 244, 170, 96, 35];
const blackKeyWidthPercent = 1.18;
const whiteKeyWidthPercent = 100 / whiteKeys.length;

function getLaneLeft(note: string) {
  return getKeyPosition(note).left;
}

function getBlackKeyLeft(note: string) {
  const chromaticIndex = pianoKeys.indexOf(note);
  const whiteBefore = pianoKeys.slice(0, chromaticIndex).filter((key) => !key.includes("#")).length;
  return `${((whiteBefore - 0.36) / whiteKeys.length) * 100}%`;
}

function getKeyPosition(note: string) {
  if (note.includes("#")) {
    return {
      left: getBlackKeyLeft(note),
      width: `${blackKeyWidthPercent}%`
    };
  }

  const whiteIndex = whiteKeys.indexOf(note);
  return {
    left: `${whiteIndex * whiteKeyWidthPercent}%`,
    width: `${whiteKeyWidthPercent}%`
  };
}

function getKeyLabel(note: string) {
  return note.replace(/\d/g, "");
}

function frequencyToNearestNote(frequency: number, toleranceCents = 80) {
  let best = pianoKeys[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const note of pianoKeys) {
    const distance = Math.abs(1200 * Math.log2(frequency / noteToFrequency(note)));
    if (distance < bestDistance) {
      best = note;
      bestDistance = distance;
    }
  }
  return bestDistance <= toleranceCents ? best : null;
}

function resolveDetectedNote(frequency: number, targetNote?: string) {
  if (targetNote) {
    const targetFrequency = noteToFrequency(targetNote);
    const candidates = [frequency, frequency / 2, frequency * 2];
    const targetWasHeard = candidates.some((candidate) => Math.abs(1200 * Math.log2(candidate / targetFrequency)) <= 95);
    if (targetWasHeard) return targetNote;
  }

  return frequencyToNearestNote(frequency);
}

function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult | null {
  let rms = 0;
  for (const value of buffer) rms += value * value;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return null;

  const minFrequency = 70;
  const maxFrequency = 1100;
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  const correlations = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index < buffer.length - lag; index += 1) {
      const left = buffer[index];
      const right = buffer[index + lag];
      sum += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    correlations[lag] = sum / Math.sqrt(leftEnergy * rightEnergy || 1);
  }

  let bestLag = -1;
  let bestCorrelation = 0;
  const threshold = 0.62;
  for (let lag = minLag + 1; lag < maxLag - 1; lag += 1) {
    const current = correlations[lag];
    if (current > threshold && current >= correlations[lag - 1] && current > correlations[lag + 1]) {
      bestLag = lag;
      bestCorrelation = current;
      break;
    }
    if (current > bestCorrelation) {
      bestLag = lag;
      bestCorrelation = current;
    }
  }

  if (bestCorrelation < 0.45 || bestLag <= 0) return null;

  const left = correlations[bestLag - 1] || 0;
  const center = correlations[bestLag];
  const right = correlations[bestLag + 1] || 0;
  const denominator = left - 2 * center + right;
  const shift = denominator === 0 ? 0 : 0.5 * (left - right) / denominator;
  const frequency = sampleRate / (bestLag + shift);

  return { frequency, clarity: bestCorrelation, rms };
}

function playPianoTone(note: string) {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const output = context.createGain();
  const filter = context.createBiquadFilter();
  const frequency = noteToFrequency(note);
  const now = context.currentTime;

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(4800, now);
  filter.frequency.exponentialRampToValueAtTime(1500, now + 0.7);
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.32, now + 0.01);
  output.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  filter.connect(output);
  output.connect(context.destination);

  [
    { ratio: 1, gain: 0.96, detune: 0 },
    { ratio: 2, gain: 0.18, detune: 2 },
    { ratio: 3, gain: 0.06, detune: -4 }
  ].forEach((partial) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = partial.ratio === 1 ? "triangle" : "sine";
    osc.frequency.value = frequency * partial.ratio;
    osc.detune.value = partial.detune;
    gain.gain.value = partial.gain;
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now + 1.18);
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/[0.055] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/55">{label}</p>
      <p className="mt-1 text-3xl font-black text-sky-200">{value}</p>
    </div>
  );
}

export function PracticeExperience() {
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  useEffect(() => setGeneratedSong(loadGeneratedSong()), []);

  const notes = useMemo(() => generatedSong?.notes ?? demoNotes, [generatedSong]);
  const title = generatedSong?.title ?? "MAFIA Piano Roll Practice";
  const totalNotes = notes.length;

  const [micEnabled, setMicEnabled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hits, setHits] = useState<HitEvent[]>([]);
  const [pressed, setPressed] = useState<string | null>(null);
  const [wrongPressed, setWrongPressed] = useState<string | null>(null);
  const [floating, setFloating] = useState<HitEvent | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [micStatus, setMicStatus] = useState("Mic OFF");
  const [scoreFile, setScoreFile] = useState<{ name: string; size: string; type: string } | null>(null);

  const audioRef = useRef<{ context: AudioContext; stream: MediaStream; frame: number } | null>(null);
  const lastDetectedRef = useRef({ note: "", time: 0 });
  const micEnabledRef = useRef(false);
  const currentNoteRef = useRef<(typeof notes)[number] | undefined>(undefined);
  const lockedRef = useRef(false);

  const currentNote = notes[currentIndex];
  const upcomingNotes = notes.slice(currentIndex + 1, currentIndex + 7);
  const visibleNotes = currentNote ? [currentNote, ...upcomingNotes] : [];
  const perfectCount = hits.filter((hit) => hit.judgement === "Perfect").length;
  const missCount = hits.filter((hit) => hit.judgement === "Miss").length;
  const accuracy = hits.length ? Math.round((perfectCount / hits.length) * 100) : 0;
  const progress = Math.round((currentIndex / totalNotes) * 100);
  const currentBarHeight = currentNote ? Math.max(60, currentNote.duration * 94) : 60;

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    currentNoteRef.current = currentNote;
  }, [currentNote]);

  const stopMic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelAnimationFrame(audio.frame);
    audio.stream.getTracks().forEach((track) => track.stop());
    void audio.context.close();
    audioRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopMic();
    micEnabledRef.current = false;
    lockedRef.current = false;
    setMicEnabled(false);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setHits([]);
    setPressed(null);
    setWrongPressed(null);
    setFloating(null);
    setShowResult(false);
    setMicStatus("Mic OFF");
  }, [stopMic]);

  const addHit = useCallback((note: string, judgement: Judgement) => {
    const event = { id: Date.now(), note, judgement };
    setHits((prev) => [event, ...prev].slice(0, 9));
    setFloating(event);
    window.setTimeout(() => setFloating((current) => (current?.id === event.id ? null : current)), 600);
  }, []);

  const advance = useCallback(() => {
    setCurrentIndex((index) => {
      if (index + 1 >= totalNotes) {
        stopMic();
        micEnabledRef.current = false;
        setMicEnabled(false);
        setShowResult(true);
        setMicStatus("완료");
        return index;
      }
      return index + 1;
    });
    lockedRef.current = false;
  }, [stopMic, totalNotes]);

  const recognizeNote = useCallback((note: string, source: "keyboard" | "mic" = "keyboard") => {
    if (source === "keyboard") playPianoTone(note);
    setPressed(note);
    window.setTimeout(() => setPressed(null), 180);

    const targetNote = currentNoteRef.current;
    if (!micEnabledRef.current || !targetNote || lockedRef.current) return;

    if (note !== targetNote.note) {
      setWrongPressed(note);
      window.setTimeout(() => setWrongPressed(null), 380);
      if (source === "mic") {
        setMicStatus(`감지: ${note} · 목표: ${targetNote.note}`);
        return;
      }
      setCombo(0);
      addHit(note, "Miss");
      setMicStatus(`다른 음 인식: ${note}`);
      return;
    }

    lockedRef.current = true;
    setMicStatus(`정답 인식: ${note}`);
    addHit(note, "Perfect");
    setScore((prev) => prev + 150);
    setCombo((prev) => {
      const next = prev + 1;
      setBestCombo((best) => Math.max(best, next));
      return next;
    });
    advance();
  }, [addHit, advance]);

  async function toggleMic() {
    if (micEnabled) {
      stopMic();
      micEnabledRef.current = false;
      setMicEnabled(false);
      setMicStatus("Mic OFF");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const context = new AudioContext();
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.05;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);

      const listen = () => {
        analyser.getFloatTimeDomainData(buffer);
        const pitch = detectPitch(buffer, context.sampleRate);
        const note = pitch ? resolveDetectedNote(pitch.frequency, currentNoteRef.current?.note) : null;
        const now = performance.now();
        if (note && now - lastDetectedRef.current.time > 220) {
          lastDetectedRef.current = { note, time: now };
          recognizeNote(note, "mic");
        } else if (pitch && now - lastDetectedRef.current.time > 420) {
          setMicStatus(`입력 감지 중 · ${Math.round(pitch.frequency)}Hz · 선명도 ${Math.round(pitch.clarity * 100)}%`);
        }
        const audio = audioRef.current;
        if (audio) audio.frame = requestAnimationFrame(listen);
      };

      micEnabledRef.current = true;
      setMicEnabled(true);
      setMicStatus("Mic ON · 실제 피아노 음을 듣는 중");
      audioRef.current = { context, stream, frame: requestAnimationFrame(listen) };
    } catch {
      micEnabledRef.current = true;
      setMicEnabled(true);
      setMicStatus("Mic ON · 마이크 권한 실패, 가상 피아노 mock 인식 모드");
    }
  }

  useEffect(() => () => stopMic(), [stopMic]);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="glass rounded-lg p-5">
          <div className="flex items-center gap-2 text-sky-200">
            <FileMusic size={19} />
            <p className="text-sm font-bold uppercase tracking-[0.18em]">내 악보 첨부</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-blue-100/62">
            가지고 있는 악보 PDF나 이미지를 올려 연습곡으로 변환하는 흐름입니다.
          </p>
          <label className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-sky-200/24 bg-slate-950/45 p-4 text-center transition hover:bg-sky-300/8">
            <Upload className="text-sky-300" size={28} />
            <span className="mt-3 text-sm font-bold text-white">악보 파일 선택</span>
            <span className="mt-1 text-xs leading-5 text-blue-100/50">PDF, PNG, JPG</span>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setScoreFile({
                  name: file.name,
                  size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                  type: file.type || "score file"
                });
              }}
            />
          </label>
          {scoreFile ? (
            <div className="mt-4 rounded-md border border-lime-300/22 bg-lime-300/10 p-3">
              <p className="text-sm font-bold text-lime-200">{scoreFile.name}</p>
              <p className="mt-1 text-xs text-blue-100/60">{scoreFile.size} · AI 변환 준비 완료</p>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-slate-950/45 p-3 text-xs leading-5 text-blue-100/50">
              첨부한 악보는 데모에서는 mock 변환으로 처리되며, 이후 NoteEvent 데이터로 변환해 Falling Notes에 연결할 수 있습니다.
            </div>
          )}
        </aside>

        <div className="overflow-hidden rounded-lg border border-sky-200/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#050505] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-md bg-sky-300 text-slate-950 shadow-glow">
              <Sparkles size={27} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/70">Piano Roll Recognition</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-white/12 bg-white/5 px-4 py-2 text-sm text-sky-100">
              <span className="text-blue-100/55">Next</span> <b>{currentNote?.note ?? "Done"}</b>
            </div>
            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 rounded-md px-5 py-3 font-black transition ${
                micEnabled ? "bg-lime-400 text-black shadow-[0_0_28px_rgba(132,204,22,0.55)]" : "border border-white/16 text-sky-100 hover:bg-white/10"
              }`}
            >
              {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              {micEnabled ? "Mic ON" : "Mic OFF"}
            </button>
            <button onClick={reset} className="rounded-md border border-white/16 p-3 text-sky-100 transition hover:bg-white/10" aria-label="Reset practice">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="grid bg-black xl:grid-cols-[minmax(0,1fr)_230px]">
          <div>
            <div className="relative overflow-x-auto bg-black">
              <div className="min-w-[1880px]">
            <div className="relative h-[520px] overflow-hidden bg-[#080808]">
              <div className="absolute inset-x-6 top-5 z-10 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div className="h-full rounded-full bg-lime-400 shadow-[0_0_24px_rgba(132,204,22,0.8)]" animate={{ width: `${progress}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-bold text-sky-100">{progress}%</span>
              </div>

              <div className="absolute inset-x-0 top-0 flex h-full px-0">
                {whiteKeys.map((key) => (
                  <div key={key} className="relative h-full flex-1 border-r border-white/[0.07]">
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-white/10">{key}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 top-0 h-full">
                {pianoKeys.filter((key) => key.includes("#")).map((key) => (
                  <div
                    key={key}
                    className="absolute top-0 h-full border-r border-white/[0.035]"
                    style={{ left: getBlackKeyLeft(key), width: `${blackKeyWidthPercent}%` }}
                  />
                ))}
              </div>

              <div className="absolute bottom-0 left-0 right-0 z-10 h-[2px] bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]" />
              <div className="absolute bottom-1 left-2 z-20 text-[10px] text-white/38">C major</div>

              <AnimatePresence mode="popLayout">
                {!showResult ? visibleNotes.map((note, index) => {
                  const height = Math.max(60, note.duration * 94);
                  const isCurrent = index === 0;
                  return (
                  <motion.div
                    layout
                    key={`${currentIndex + index}-${note.note}`}
                    data-roll-note={note.note}
                    className={`absolute z-30 overflow-hidden rounded-md border border-blue-100 bg-gradient-to-b from-blue-200 to-blue-500 text-center text-sm font-black text-white shadow-[0_0_24px_rgba(96,165,250,0.7)] ${
                      isCurrent ? "ring-2 ring-lime-300/90" : "opacity-90"
                    }`}
                    style={{
                      left: `calc(${getLaneLeft(note.note)} + 3px)`,
                      width: `calc(${getKeyPosition(note.note).width} - 6px)`,
                      height,
                      top: isCurrent ? rollHeight - height - currentBarBottom : previewTops[index - 1]
                    }}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: isCurrent ? 1 : 0.9, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.13, ease: "easeOut" }}
                  >
                    <div className="h-2 bg-white/70" />
                    <div className="grid h-full place-items-center">{getKeyLabel(note.note)}</div>
                  </motion.div>
                  );
                }) : null}
              </AnimatePresence>

              <AnimatePresence>
                {floating ? (
                  <motion.div
                    key={`${floating.id}-${floating.judgement}`}
                    initial={{ opacity: 0, y: 30, scale: 0.88 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -28, scale: 0.96 }}
                    className={`absolute left-1/2 top-[42%] z-50 -translate-x-1/2 rounded-lg border px-8 py-4 text-4xl font-black ${
                      floating.judgement === "Perfect"
                        ? "border-orange-100 bg-orange-400 text-black shadow-[0_0_46px_rgba(251,146,60,0.95)]"
                        : "border-slate-500 bg-slate-800 text-slate-100"
                    }`}
                  >
                    {floating.judgement}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="relative h-44 border-t-2 border-red-500 bg-black px-0 pb-5 pt-0">
              <div className="relative mx-auto h-full w-full">
                <div className="flex h-full gap-[1px]">
                  {whiteKeys.map((key) => {
                    const target = currentNote?.note === key;
                    const correct = pressed === key && target;
                    const wrong = wrongPressed === key;
                    return (
                      <button
                        key={key}
                        data-piano-note={key}
                        onMouseDown={() => recognizeNote(key)}
                      className={`relative h-full flex-1 rounded-b-sm border border-black text-[13px] font-medium transition ${
                          wrong
                            ? "bg-slate-700 text-slate-300"
                            : correct
                              ? "bg-orange-400 text-black shadow-[0_0_34px_rgba(251,146,60,0.95)]"
                              : target
                                ? "bg-lime-400 text-black shadow-[0_0_28px_rgba(132,204,22,0.9)]"
                                : "bg-white text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2">{key}</span>
                      </button>
                    );
                  })}
                </div>
                {pianoKeys.filter((key) => key.includes("#")).map((key) => {
                  const left = getBlackKeyLeft(key);
                  const target = currentNote?.note === key;
                  const correct = pressed === key && target;
                  const wrong = wrongPressed === key;
                  return (
                    <button
                      key={key}
                      data-piano-note={key}
                      onMouseDown={() => recognizeNote(key)}
                      className={`absolute top-0 h-[64%] rounded-b-sm border border-black text-[8px] font-bold transition ${
                        wrong
                          ? "bg-slate-700 text-slate-300"
                          : correct
                            ? "bg-orange-500 text-black shadow-[0_0_30px_rgba(251,146,60,0.9)]"
                            : target
                              ? "bg-lime-400 text-black shadow-[0_0_26px_rgba(132,204,22,0.9)]"
                              : "bg-black text-slate-600 hover:bg-slate-900"
                      }`}
                      style={{ left, width: `${blackKeyWidthPercent}%` }}
                    >
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2">{key}</span>
                    </button>
                  );
                })}
              </div>
            </div>
              </div>
              {!micEnabled && !showResult ? (
                <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 grid h-[520px] place-items-center bg-black/42">
                  <div className="rounded-lg border border-white/14 bg-black/72 px-7 py-5 text-center backdrop-blur-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-lime-300/85">Mic OFF</p>
                    <p className="mt-2 text-2xl font-black text-white">마이크를 켜고 피아노 음을 입력하세요</p>
                    <p className="mt-2 text-sm text-blue-100/65">다음으로 눌러야 하는 건반은 초록색으로 표시됩니다.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="border-t border-white/10 bg-[#050505] p-5 xl:border-l xl:border-t-0">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <Metric label="Score" value={score.toLocaleString()} />
              <Metric label="Accuracy" value={`${accuracy}%`} />
              <Metric label="Combo" value={`${combo}x`} />
            </div>

            <div className="mt-5 rounded-lg border border-white/12 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-sky-200">
                <Activity size={18} />
                <p className="text-sm font-bold uppercase tracking-[0.18em]">Recognition</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-orange-400/15 p-2"><p className="text-lg font-black text-orange-200">{perfectCount}</p><p className="text-[10px] text-blue-100/55">Perfect</p></div>
                <div className="rounded-md bg-slate-700/55 p-2"><p className="text-lg font-black text-slate-200">{missCount}</p><p className="text-[10px] text-blue-100/55">Wrong</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {hits.length ? hits.slice(0, 5).map((hit) => (
                  <div key={`${hit.id}-${hit.note}`} className="flex items-center justify-between rounded-md bg-black/45 px-3 py-2 text-sm">
                    <span className="font-semibold">{hit.note}</span>
                    <span className={hit.judgement === "Perfect" ? "text-orange-200" : "text-slate-300"}>{hit.judgement}</span>
                  </div>
                )) : (
                  <p className="rounded-md bg-black/45 p-3 text-sm leading-6 text-blue-100/62">Mic를 켠 뒤 초록색 건반을 누르거나 실제 피아노를 쳐보세요.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/12 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-lime-300">
                <Mic size={18} />
                <p className="text-sm font-bold uppercase tracking-[0.18em]">Mic Input</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-50/72">{micStatus}</p>
              <p className="mt-2 text-xs leading-5 text-blue-100/45">실제 마이크 입력을 분석해 C3-B5 범위의 가장 가까운 피아노 음으로 매칭합니다.</p>
            </div>

            <div className="mt-5 rounded-lg border border-white/12 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-sky-200">
                <Brain size={18} />
                <p className="text-sm font-bold uppercase tracking-[0.18em]">AI Coach Live</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-blue-50/76">
                {hits.length === 0
                  ? "파란 막대가 현재 쳐야 하는 음입니다. 맞게 치면 주황색으로 바뀐 뒤 사라지고, 다음 막대가 바로 맨 밑에 나타납니다."
                  : missCount > 2
                    ? "다른 음이 자주 들어오고 있어요. 초록색 건반 위치를 먼저 확인하세요."
                    : combo >= 5
                      ? "좋아요. 정답 입력 흐름이 안정적입니다."
                      : "초록색 건반과 파란 막대가 같은 음인지 확인하세요."}
              </p>
            </div>
          </aside>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {showResult ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/76 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.94, y: 22 }} animate={{ scale: 1, y: 0 }} className="glass w-full max-w-2xl rounded-lg p-8 text-center">
              <Trophy className="mx-auto text-sky-300" size={48} />
              <h2 className="mt-4 text-4xl font-black">Practice Complete</h2>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Metric label="Score" value={score.toLocaleString()} />
                <Metric label="Accuracy" value={`${accuracy}%`} />
                <Metric label="Best Combo" value={`${bestCombo}x`} />
              </div>
              <div className="mt-6 rounded-lg border border-sky-200/14 bg-white/[0.055] p-5 text-left">
                <div className="flex items-center gap-2 text-sky-200">
                  <Gauge size={18} />
                  <p className="text-sm font-bold uppercase tracking-[0.18em]">AI Result Analysis</p>
                </div>
                <ul className="mt-3 space-y-2 text-blue-50/78">
                  <li>정답 막대가 파란색에서 주황색으로 바뀌며 정상 처리되었습니다.</li>
                  <li>틀린 입력은 건반만 어둡게 표시하고 현재 막대는 유지됩니다.</li>
                  <li>다음 세션은 같은 곡을 더 안정적인 템포로 반복해보세요.</li>
                </ul>
              </div>
              <button onClick={reset} className="mt-6 rounded-md bg-sky-300 px-6 py-3 font-black text-slate-950 hover:bg-sky-200">다시 연습하기</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
