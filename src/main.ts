import "./style.css";
import { Game, nextCombo } from "./engine.ts";
import type { Direction } from "./engine.ts";
import { Renderer } from "./renderer.ts";
import { PondAudio } from "./audio.ts";
import { RecordStore, browserStorage, dayKey } from "./storage.ts";
import { connectBridge } from "./bridge.ts";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const game = new Game();
const records = new RecordStore(browserStorage());
const audio = new PondAudio();
audio.enabled = records.value.sound;
const canvas = el<HTMLCanvasElement>("pond");
const renderer = new Renderer(canvas, game);
const fmt = (n: number) => Math.floor(n).toLocaleString("en-US");
let toastUntil = 0;
let lastPhase = game.phase;
let frame = 0;
let previousTime = 0;
let domTime = 0;
let helpSeen = false;
const controls = ["hop-left", "hop-right", "bank-button", "pause-button"];
const bridge = connectBridge(pause, resume);
const pauseOverlay = el("pause-overlay"),
  overOverlay = el("over-overlay");
const modalBackground = [
  "scoreboard",
  "pond-top",
  "intro",
  "play-status",
  "game-controls",
  "keyboard-instructions",
  "touch-instructions",
  "sidebar",
  "page-heading",
  "site-header",
  "skip-link",
];
function modalState(open: boolean) {
  canvas.inert = open;
  for (const selector of modalBackground)
    document
      .querySelectorAll<HTMLElement>(`.${selector}`)
      .forEach((node) => (node.inert = open));
  document.querySelector("footer")!.inert = open;
}
function updateRecords() {
  const r = records.value;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const currentStreak = [dayKey(), dayKey(yesterday)].includes(r.lastDay)
    ? r.streak
    : 0;
  el("best-score").textContent = r.bestScore ? fmt(r.bestScore) : "—";
  el("best-height").textContent = r.bestHeight ? `${r.bestHeight} m` : "—";
  el("daily-streak").textContent =
    `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`;
  el("streak-note").textContent =
    r.lastDay === dayKey()
      ? `Daily boost: +${Math.min(r.streak, 7) * 25} on your first bank.`
      : currentStreak
        ? "Play today to keep your streak going."
        : "Play today. Start your streak.";
  el("storage-note").textContent = records.persistent
    ? "Saved on this browser."
    : "Session records only. Storage is unavailable.";
}
function toast(message: string, seconds = 2) {
  el("pond-toast").textContent = message;
  el("pond-toast").classList.add("visible");
  toastUntil = performance.now() + seconds * 1000;
}
function start() {
  document.body.classList.add("in-run");
  modalState(false);
  pauseOverlay.hidden = true;
  overOverlay.hidden = true;
  el("intro").hidden = true;
  el("play-status").hidden = false;
  game.reset(records.play());
  window.scrollTo({ top: 0, behavior: "instant" });
  audio.beat = 0;
  audio.tick = 0;
  audio.setActive(true);
  void audio.gesture();
  helpSeen = false;
  el("pond-toast").classList.remove("visible");
  updateRecords();
  canvas.focus({ preventScroll: true });
  updateUI();
  lastPhase = game.phase;
}
function pause() {
  if (game.phase !== "playing") return;
  game.pause();
  audio.setActive(false);
  pauseOverlay.hidden = false;
  modalState(true);
  el("resume-button").focus({ preventScroll: true });
  updateUI();
}
function resume() {
  if (game.phase !== "paused" || document.hidden) return;
  game.resume();
  audio.setActive(true);
  pauseOverlay.hidden = true;
  modalState(false);
  void audio.gesture();
  canvas.focus({ preventScroll: true });
  updateUI();
}
function finish() {
  const best = game.score > records.value.bestScore;
  records.finish(game.score, game.height);
  updateRecords();
  bridge.score(game.score);
  el("over-title").textContent =
    game.reason === "Moonset" ? "The moon calls time." : "So close. So pond.";
  const next = nextCombo(game.combo),
    distance = next ? next.pads - game.combo : 0;
  el("loss-message").textContent = game.lost
    ? `Lost ${fmt(game.lost)}${next ? ` — ${distance} ${distance === 1 ? "pad" : "pads"} from ×${next.value}.` : ". What a climb."}`
    : game.score
      ? "Every banked coin is safe. Nice instincts."
      : "Hop to a pad, then BANK to save your coins.";
  el("final-score").textContent = fmt(game.score);
  el("new-best").hidden = !best;
  el("result-best").textContent = fmt(records.value.bestScore);
  el("result-height").textContent = `${records.value.bestHeight} m`;
  el("result-streak").textContent =
    `${records.value.streak} ${records.value.streak === 1 ? "day" : "days"}`;
  el("run-detail").textContent =
    `${game.height} m climbed · ${game.bankCount} ${game.bankCount === 1 ? "bank" : "banks"} · ${Math.floor(game.elapsed)}s in the pond`;
  el("play-status").hidden = true;
  el("pond-toast").classList.remove("visible");
  overOverlay.hidden = false;
  modalState(true);
  el("restart-button").focus({ preventScroll: true });
  audio.setActive(false);
  updateUI();
}
function aim(direction: Direction) {
  if (game.phase === "playing") game.aimAt(direction);
  updateUI();
}
function hop(direction?: Direction) {
  void audio.gesture();
  game.hop(direction);
  updateUI();
}
function bank() {
  void audio.gesture();
  if (!game.bank() && game.phase === "playing")
    toast("Hop to a new pad to fill your pot.");
  updateUI();
}
function toggleSound() {
  audio.setEnabled(!audio.enabled);
  records.value.sound = audio.enabled;
  records.save();
  updateSound();
}
function updateSound() {
  el("sound-button").setAttribute("aria-pressed", String(audio.enabled));
  el("sound-button").title = audio.enabled
    ? "Sound on — tap to mute"
    : "Sound off — tap to enable";
  el("sound-waves").setAttribute(
    "d",
    audio.enabled
      ? "M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"
      : "m16 9 5 6m0-6-5 6",
  );
}
function updateUI() {
  el("score").textContent = fmt(game.score);
  el("pot").textContent = fmt(game.pot);
  el("height").textContent = String(game.height);
  el("multiplier").textContent = `×${game.multiplier}`;
  const seconds = Math.ceil(game.remaining);
  el("timer").textContent =
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  el("timer").setAttribute("aria-label", `${seconds} seconds remaining`);
  el("timer").classList.toggle("urgent", seconds <= 10);
  const playing = game.phase === "playing";
  for (const id of controls) el<HTMLButtonElement>(id).disabled = !playing;
  el<HTMLButtonElement>("bank-button").disabled = !playing || game.pot === 0;
  el("bank-amount").textContent = game.pot ? ` ${fmt(game.pot)}` : "";
  el("bank-hint").textContent = game.pot
    ? "Save pot · reset combo"
    : "Keep what you collect";
  el("hop-left").classList.toggle("aimed", playing && game.aim === -1);
  el("hop-right").classList.toggle("aimed", playing && game.aim === 1);
  el("zone-label").textContent =
    game.height >= 25
      ? "The starlit shallows"
      : game.height >= 12
        ? "The firefly grove"
        : "The quiet pond";
  el("pad-life").style.width = `${game.life * 100}%`;
  el("pad-life").style.background =
    game.life < 0.3 ? "var(--danger)" : "var(--green)";
  const kind = game.pad.kind;
  const nextSide = game.next.x < game.x ? "left" : "right";
  el("pad-status").textContent = game.falling
    ? "Quick! Bank before the splash!"
    : game.jump
      ? "Make it a good landing."
      : game.current === 0
        ? `First pad is left. Aim ←, then hop.`
        : kind === "crumble"
          ? `Crumbler! Hop ${nextSide} — now.`
          : kind === "sink"
            ? `Sinking! Hop ${nextSide} before it goes under.`
            : `Next pad: ${nextSide}${game.multiplier > 1 ? ` · ×${game.multiplier} combo` : ""}`;
  if (game.remaining <= 10 && !game.falling)
    el("pad-status").textContent =
      `Moonset in ${seconds}s. BANK before the time runs out.`;
  if (game.phase === "playing" && game.current === 0 && !helpSeen) {
    toast("Aim left, then Space. Or tap the left side.", 3);
    helpSeen = true;
  }
}
el("play-button").addEventListener("click", start);
el("restart-button").addEventListener("click", start);
el("pause-restart").addEventListener("click", start);
el("pause-button").addEventListener("click", pause);
el("resume-button").addEventListener("click", resume);
el("sound-button").addEventListener("click", toggleSound);
el("hop-left").addEventListener("click", () => hop(-1));
el("hop-right").addEventListener("click", () => hop(1));
el("bank-button").addEventListener("click", bank);
// Pointer controls hand focus back to the game; Tab keeps native button activation.
for (const id of ["sound-button", "hop-left", "hop-right", "bank-button"])
  el(id).addEventListener("click", (event) => {
    if (event.detail > 0 && game.phase === "playing")
      canvas.focus({ preventScroll: true });
  });
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (game.phase !== "playing") return;
  const r = canvas.getBoundingClientRect();
  hop(event.clientX < r.left + r.width / 2 ? -1 : 1);
  canvas.focus({ preventScroll: true });
});
window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key === "tab" && (game.phase === "paused" || game.phase === "over")) {
    const overlay = game.phase === "paused" ? pauseOverlay : overOverlay;
    const buttons = [...overlay.querySelectorAll<HTMLButtonElement>("button")];
    const first = buttons[0],
      last = buttons.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
    return;
  }
  const onButton = (event.target as HTMLElement).closest("button,a");
  if (onButton && (key === " " || key === "enter")) return;
  if (
    [
      "arrowleft",
      "arrowright",
      "a",
      "d",
      " ",
      "w",
      "b",
      "enter",
      "p",
      "escape",
    ].includes(key)
  )
    event.preventDefault();
  else return;
  if (event.repeat) return;
  if (key === "p" || key === "escape") {
    if (game.phase === "playing") pause();
    else if (game.phase === "paused") resume();
    return;
  }
  if (game.phase === "ready" || game.phase === "over") {
    if (key === " " || key === "w" || key === "enter") start();
    return;
  }
  if (game.phase !== "playing") return;
  if (key === "arrowleft" || key === "a") aim(-1);
  if (key === "arrowright" || key === "d") aim(1);
  if (key === " " || key === "w") hop();
  if (key === "b" || key === "enter") bank();
});
window.addEventListener("blur", pause);
function loop(time: number) {
  const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
  previousTime = time;
  game.update(dt);
  for (const event of game.events.splice(0)) {
    audio.effect(event.type);
    if (event.type === "bank") {
      renderer.burst();
      toast(`Banked +${fmt(event.value!)}. All yours.`, 2);
    }
    if (event.type === "fly") {
      renderer.burst();
      toast("Golden fly! Your pot just doubled.", 2.5);
    }
    if (event.type === "land" && [2, 5, 9, 14, 20, 28, 40].includes(game.combo))
      toast(`×${game.multiplier} combo. Feeling brave?`, 1.5);
    if (event.type === "fall") renderer.burst(false);
  }
  if (game.phase === "over" && lastPhase !== "over") finish();
  lastPhase = game.phase;
  if (game.phase === "playing") audio.update(dt, game.pot, game.height);
  renderer.render(game.phase === "paused" ? 0 : dt);
  if (time - domTime > 70) {
    updateUI();
    domTime = time;
  }
  if (time > toastUntil) el("pond-toast").classList.remove("visible");
  frame = requestAnimationFrame(loop);
}
updateRecords();
updateSound();
updateUI();
frame = requestAnimationFrame(loop);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  audio.setActive(false);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    previousTime = 0;
    frame = requestAnimationFrame(loop);
  }
});
