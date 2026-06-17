import type { GeneratedSong } from "./notes";

const songKey = "mafia-generated-song";

export function saveGeneratedSong(song: GeneratedSong) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(songKey, JSON.stringify(song));
}

export function loadGeneratedSong(): GeneratedSong | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(songKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GeneratedSong;
  } catch {
    return null;
  }
}
