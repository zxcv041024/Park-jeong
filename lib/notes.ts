export type NoteEvent = {
  note: string;
  startTime: number;
  duration: number;
  hand?: "left" | "right";
};

export type GeneratedSong = {
  title: string;
  bpm: number;
  genre: string;
  difficulty: string;
  mood: string;
  length: string;
  chords: string[];
  notes: NoteEvent[];
};

export const chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const pianoKeys = Array.from({ length: 88 }, (_, index) => {
  const midi = index + 21;
  const pitch = chromatic[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pitch}${octave}`;
});

export const whiteKeys = pianoKeys.filter((note) => !note.includes("#"));

export const demoNotes: NoteEvent[] = [
  { note: "E4", startTime: 0, duration: 0.72, hand: "right" },
  { note: "A4", startTime: 1, duration: 0.78, hand: "right" },
  { note: "B4", startTime: 2, duration: 0.62, hand: "right" },
  { note: "G4", startTime: 3, duration: 0.82, hand: "right" },
  { note: "C5", startTime: 4, duration: 0.78, hand: "right" },
  { note: "G3", startTime: 5, duration: 0.88, hand: "left" },
  { note: "C3", startTime: 6, duration: 0.92, hand: "left" },
  { note: "A3", startTime: 7, duration: 0.7, hand: "left" },
  { note: "E4", startTime: 8, duration: 0.64, hand: "right" },
  { note: "G4", startTime: 9, duration: 0.66, hand: "right" },
  { note: "A4", startTime: 10, duration: 0.72, hand: "right" },
  { note: "C5", startTime: 11, duration: 0.86, hand: "right" },
  { note: "B4", startTime: 12, duration: 0.62, hand: "right" },
  { note: "G4", startTime: 13, duration: 0.72, hand: "right" }
];

export const lessons = [
  { title: "첫 Falling Notes", level: "초급", progress: 92, focus: "오른손 멜로디와 판정선 타이밍" },
  { title: "왼손 독립성", level: "중급", progress: 64, focus: "C3-G3 베이스 패턴 유지" },
  { title: "K-POP 발라드 루프", level: "초급", progress: 48, focus: "I-V-vi-IV 코드 진행" },
  { title: "양손 코드 + 멜로디", level: "고급", progress: 18, focus: "동시 NoteEvent 처리" }
];

export const dashboardRecords = [
  { song: "MAFIA Signature Demo", accuracy: 91, combo: 18, score: 4280, date: "오늘" },
  { song: "K-POP Ballad Loop", accuracy: 84, combo: 12, score: 3190, date: "어제" },
  { song: "Left Hand Independence", accuracy: 78, combo: 9, score: 2470, date: "3일 전" }
];

export const leaderboard = [
  { name: "Jin", badge: "오늘의 피아니스트", score: 9820, accuracy: 96 },
  { name: "Mina", badge: "연속 학습왕", score: 8730, accuracy: 93 },
  { name: "You", badge: "왼손 루키", score: 7410, accuracy: 88 },
  { name: "Leo", badge: "콤보 마스터", score: 6920, accuracy: 86 }
];

export function makeGeneratedSong(genre: string, difficulty: string, mood: string, length: string): GeneratedSong {
  const spacing = difficulty === "고급" ? 0.5 : difficulty === "초급" ? 0.92 : 0.68;
  const repeats = length === "16마디" ? 4 : length === "8마디" ? 2 : 1;
  const rightHand = genre === "K-POP"
    ? ["E4", "G4", "C5", "B4", "A4", "G4", "E4", "D4"]
    : ["C4", "E4", "G4", "A4", "G4", "E4", "D4", "C4"];
  const leftRoots = ["C3", "G3", "A3", "F3"];
  const notes: NoteEvent[] = [];

  for (let round = 0; round < repeats; round += 1) {
    const offset = round * rightHand.length * spacing;
    rightHand.forEach((note, index) => {
      const startTime = Number((offset + index * spacing + 0.8).toFixed(2));
      notes.push({ note, startTime, duration: index % 4 === 2 ? 0.78 : 0.48, hand: "right" });
      if (index % 2 === 0) {
        notes.push({ note: leftRoots[(index / 2) % leftRoots.length], startTime, duration: 1.15, hand: "left" });
      }
    });
  }

  return {
    title: `${mood} ${genre} Piano Style`,
    bpm: difficulty === "고급" ? 118 : difficulty === "초급" ? 76 : 96,
    genre,
    difficulty,
    mood,
    length,
    chords: genre === "K-POP" ? ["C", "G/B", "Am", "F"] : ["Cmaj7", "G", "Am7", "Fadd9"],
    notes
  };
}

export function makeConvertedSong(url: string): GeneratedSong {
  const sourceName = url.includes("youtube") || url.includes("youtu.be") ? "YouTube" : "Audio";
  return {
    ...makeGeneratedSong("K-POP", "초급", "Idol Cover", "8마디"),
    title: `${sourceName} Converted Practice`,
    chords: ["C", "G", "Am", "F"]
  };
}

export function noteToFrequency(note: string) {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;
  const [, pitch, octaveText] = match;
  const octave = Number(octaveText);
  const semitones: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11
  };
  const midi = (octave + 1) * 12 + semitones[pitch];
  return 440 * 2 ** ((midi - 69) / 12);
}
