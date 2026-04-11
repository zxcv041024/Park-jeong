const clock = document.getElementById("clock");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const backgroundColorInput = document.getElementById("backgroundColor");
const showSecondsInput = document.getElementById("showSeconds");
const presetButtons = Array.from(document.querySelectorAll(".preset"));

const BACKGROUND_KEY = "hud-clock-background";
const SHOW_SECONDS_KEY = "hud-clock-show-seconds";
const BASE_PATH = window.location.pathname.includes("/Park-jeong/") ? "/Park-jeong" : "";

function formatTime(date, showSeconds) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(date);
}

function updateClock() {
  const showSeconds = showSecondsInput.checked;
  clock.textContent = formatTime(new Date(), showSeconds);
  clock.classList.toggle("show-seconds", showSeconds);
}

function getContrastTextColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#111111" : "#ffffff";
}

function syncPresetState(color) {
  presetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color.toLowerCase() === color.toLowerCase());
  });
}

function applyBackground(color) {
  const safeColor = color || "#000000";
  const textColor = getContrastTextColor(safeColor);

  document.documentElement.style.setProperty("--bg-color", safeColor);
  document.documentElement.style.setProperty("--text-color", textColor);
  backgroundColorInput.value = safeColor;
  syncPresetState(safeColor);
  localStorage.setItem(BACKGROUND_KEY, safeColor);
}

function toggleSettings(forceOpen) {
  const isOpen = settingsPanel.classList.contains("is-open");
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !isOpen;

  settingsPanel.classList.toggle("is-open", shouldOpen);
  settingsToggle.setAttribute("aria-expanded", String(shouldOpen));
  settingsPanel.setAttribute("aria-hidden", String(!shouldOpen));
}

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyBackground(button.dataset.color);
  });
});

backgroundColorInput.addEventListener("input", (event) => {
  applyBackground(event.target.value);
});

showSecondsInput.addEventListener("change", (event) => {
  localStorage.setItem(SHOW_SECONDS_KEY, String(event.target.checked));
  updateClock();
});

settingsToggle.addEventListener("click", () => {
  toggleSettings();
});

settingsPanel.addEventListener("click", (event) => {
  if (event.target === settingsPanel) {
    toggleSettings(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleSettings(false);
  }
});

const savedBackground = localStorage.getItem(BACKGROUND_KEY);
const savedShowSeconds = localStorage.getItem(SHOW_SECONDS_KEY) === "true";

showSecondsInput.checked = savedShowSeconds;
applyBackground(savedBackground || "#000000");
updateClock();

setInterval(updateClock, 1000);

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js`).catch(() => {
      // PWA registration failure should not block the clock UI.
    });
  });
}
