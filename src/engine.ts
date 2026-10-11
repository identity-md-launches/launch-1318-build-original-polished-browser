export type Phase = "ready" | "playing" | "paused" | "over";
export type PadKind = "lily" | "drift" | "sink" | "crumble";
export type Direction = -1 | 0 | 1;
export interface Pad {
  id: number;
  baseX: number;
  x: number;
  y: number;
  width: number;
  kind: PadKind;
  wave: number;
  fly: boolean;
  visited: boolean;
}
export interface Jump {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
}
export interface GameEvent {
  type: "hop" | "land" | "bank" | "fly" | "fall" | "over";
  value?: number;
}
export const RUN_SECONDS = 75;
export const COMBOS = [
  { pads: 0, value: 1 },
  { pads: 2, value: 2 },
  { pads: 5, value: 3 },
  { pads: 9, value: 5 },
  { pads: 14, value: 8 },
  { pads: 20, value: 10 },
  { pads: 28, value: 15 },
  { pads: 40, value: 20 },
];
export const multiplierFor = (combo: number) =>
  COMBOS.reduce((value, c) => (combo >= c.pads ? c.value : value), 1);
export const nextCombo = (combo: number) => COMBOS.find((c) => combo < c.pads);
export const padLife = (p: Pad) =>
  p.id === 0
    ? 8
    : p.kind === "crumble"
      ? 0.95
      : p.kind === "sink"
        ? 1.65
        : p.kind === "drift"
          ? 3.2
          : 4;

export class Game {
  phase: Phase = "ready";
  pads: Pad[] = [];
  x = 240;
  y = 0;
  camera = 0;
  cameraFollow = 160;
  current = 0;
  height = 0;
  score = 0;
  pot = 0;
  combo = 0;
  elapsed = 0;
  worldTime = 0;
  standing = 0;
  aim: Direction = -1;
  jump: Jump | null = null;
  falling = 0;
  lost = 0;
  reason = "";
  bankCount = 0;
  flyCount = 0;
  bonus = 25;
  bonusUsed = false;
  events: GameEvent[] = [];
  random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
    this.reset();
    this.phase = "ready";
  }
  reset(bonus = 25) {
    this.phase = "playing";
    this.pads = [
      {
        id: 0,
        baseX: 240,
        x: 240,
        y: 0,
        width: 126,
        kind: "lily",
        wave: 0,
        fly: false,
        visited: true,
      },
    ];
    this.x = 240;
    this.y = 0;
    this.camera = 0;
    this.current = 0;
    this.height = 0;
    this.score = 0;
    this.pot = 0;
    this.combo = 0;
    this.elapsed = 0;
    this.worldTime = 0;
    this.standing = 0;
    this.aim = -1;
    this.jump = null;
    this.falling = 0;
    this.lost = 0;
    this.reason = "";
    this.bankCount = 0;
    this.flyCount = 0;
    this.bonus = bonus;
    this.bonusUsed = false;
    this.events = [];
    this.generate();
  }
  generate() {
    while (this.pads.length < this.current + 10) {
      const id = this.pads.length;
      const previous = this.pads[id - 1];
      let side =
        previous.baseX >= 260
          ? -1
          : previous.baseX <= 190
            ? 1
            : this.random() < 0.5
              ? -1
              : 1;
      if (id === 1) side = -1;
      const baseX = Math.max(
        100,
        Math.min(380, previous.baseX + side * (108 + this.random() * 28)),
      );
      const roll = this.random();
      const kind: PadKind =
        id < 3
          ? "lily"
          : id === 3
            ? "drift"
            : id === 4
              ? "sink"
              : id === 5
                ? "crumble"
                : roll < 0.25
                  ? "lily"
                  : roll < 0.57
                    ? "drift"
                    : roll < 0.8
                      ? "sink"
                      : "crumble";
      this.pads.push({
        id,
        baseX,
        x: baseX,
        y: id * 112,
        width: Math.max(76, 118 - id * 0.9),
        kind,
        wave: this.random() * Math.PI * 2,
        fly: id > 5 && this.random() < 0.075,
        visited: false,
      });
    }
  }
  get multiplier() {
    return multiplierFor(this.combo);
  }
  get remaining() {
    return Math.max(0, RUN_SECONDS - this.elapsed);
  }
  get pad() {
    return this.pads[this.current];
  }
  get next() {
    return this.pads[this.current + 1];
  }
  get life() {
    return Math.max(0, 1 - this.standing / padLife(this.pad));
  }
  aimAt(direction: Direction) {
    this.aim = direction;
  }
  hop(direction: Direction = this.aim) {
    if (this.phase !== "playing" || this.jump || this.falling) return false;
    this.aim = direction;
    const actualSide = Math.sign(this.next.x - this.x);
    // Directional hops aim at the pad's current position; drift during flight still matters.
    const toX =
      direction === actualSide ? this.next.x : this.x + direction * 120;
    this.jump = {
      fromX: this.x,
      fromY: this.y,
      toX,
      toY: this.next.y,
      progress: 0,
    };
    this.events.push({ type: "hop" });
    return true;
  }
  bank() {
    if (this.phase !== "playing" || this.pot === 0) return 0;
    const amount = this.pot + (this.bonusUsed ? 0 : this.bonus);
    this.score += amount;
    this.pot = 0;
    this.combo = 0;
    this.bankCount++;
    this.bonusUsed = true;
    this.events.push({ type: "bank", value: amount });
    return amount;
  }
  pause() {
    if (this.phase === "playing") this.phase = "paused";
  }
  resume() {
    if (this.phase === "paused") this.phase = "playing";
  }
  fall() {
    if (!this.falling) {
      this.falling = 0.001;
      this.jump = null;
      this.events.push({ type: "fall" });
    }
  }
  finish(reason: string) {
    if (this.phase === "over") return;
    this.phase = "over";
    this.reason = reason;
    this.lost = this.pot;
    this.pot = 0;
    this.events.push({ type: "over" });
  }
  update(dt: number) {
    if (this.phase !== "playing") return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    this.worldTime += dt;
    if (this.remaining <= 0) {
      this.finish("Moonset");
      return;
    }
    for (const p of this.pads) {
      const amplitude =
        p.kind === "drift" ? Math.min(44, 20 + p.id * 0.5) : p.id === 0 ? 0 : 4;
      const speed =
        p.kind === "drift" ? 1.1 + Math.min(3.4, p.id * 0.045) : 0.8;
      p.x = p.baseX + Math.sin(this.worldTime * speed + p.wave) * amplitude;
    }
    if (this.falling) {
      this.falling += dt;
      this.y -= dt * (140 + this.falling * 580);
      if (this.falling >= 0.75) this.finish("A little too ambitious.");
      return;
    }
    if (this.jump) {
      const j = this.jump;
      j.progress = Math.min(1, j.progress + dt / 0.58);
      const t = j.progress;
      this.x = j.fromX + (j.toX - j.fromX) * t;
      this.y = j.fromY + (j.toY - j.fromY) * t + Math.sin(t * Math.PI) * 90;
      if (t >= 1) {
        if (Math.abs(this.x - this.next.x) <= this.next.width * 0.41) {
          this.current++;
          this.height = this.current;
          this.combo++;
          this.standing = 0;
          this.pot +=
            (100 + Math.floor(this.height / 5) * 25) * this.multiplier;
          this.x = this.pad.x;
          this.y = this.pad.y;
          this.pad.visited = true;
          this.events.push({ type: "land", value: this.multiplier });
          if (this.pad.fly && Math.abs(j.toX - this.pad.x) < 28) {
            this.pot *= 2;
            this.pad.fly = false;
            this.flyCount++;
            this.events.push({ type: "fly", value: this.pot });
          }
          this.jump = null;
          this.generate();
        } else this.fall();
      }
    } else {
      this.x = this.pad.x;
      this.standing += dt;
      if (this.standing >= padLife(this.pad)) this.fall();
    }
    const target = Math.max(0, this.y - this.cameraFollow);
    this.camera += (target - this.camera) * Math.min(1, dt * 7);
  }
}
