import type { Game, Pad } from "./engine.ts";
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  coin: boolean;
}
const TAU = Math.PI * 2;
export class Renderer {
  ctx: CanvasRenderingContext2D;
  width = 700;
  height = 510;
  scale = 1;
  frog = new Image();
  panic = new Image();
  grin = new Image();
  particles: Particle[] = [];
  time = 0;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor(
    public canvas: HTMLCanvasElement,
    public game: Game,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.frog.src = new URL("./frog.svg", document.baseURI).href;
    this.panic.src = new URL("./frog-panic.svg", document.baseURI).href;
    this.grin.src = new URL("./frog-grin.svg", document.baseURI).href;
    new ResizeObserver(() => this.resize()).observe(canvas);
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => (this.reduced = e.matches),
    );
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(
      1.03,
      this.width / 480,
      Math.max(0.45, this.height / 410),
    );
    this.game.cameraFollow = Math.max(
      40,
      Math.min(220, (this.height * 0.42 - 95) / this.scale),
    );
  }
  xy(x: number, y: number): [number, number] {
    return [
      this.width / 2 + (x - 240) * this.scale,
      this.height -
        (this.game.phase === "ready" ? 48 : 95) -
        (y - this.game.camera) * this.scale,
    ];
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
    rotation = 0,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, rotation, 0, TAU);
    c.fillStyle = color;
    c.fill();
  }
  path(points: number[], fill: string) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2)
      c.lineTo(points[i], points[i + 1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  glow(x: number, y: number, radius: number, color: string) {
    const c = this.ctx;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "#eddf7900");
    c.fillStyle = g;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  burst(coin = true) {
    if (this.reduced) return;
    const [x, y] = this.xy(this.game.x, this.game.y);
    for (let i = 0; i < (coin ? 26 : 14); i++)
      this.particles.push({
        x,
        y: y - 50 * this.scale,
        vx: (Math.random() - 0.5) * 260,
        vy: -80 - Math.random() * 180,
        life: 0,
        max: 0.7 + Math.random() * 0.5,
        coin,
      });
  }
  background() {
    const c = this.ctx,
      w = this.width,
      h = this.height,
      t = this.reduced ? 0 : this.time;
    const magic = Math.min(1, this.game.height / 35);
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, magic > 0.5 ? "#123449" : "#12383a");
    bg.addColorStop(0.48, "#1a5350");
    bg.addColorStop(1, "#347166");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    // The moon, a softly lit sky, and distant rounded pond banks.
    const mx = w < 500 ? w * 0.85 : w * 0.78,
      my = (w < 500 ? 76 : 100) - magic * 20;
    const moonRadius = w < 500 ? 32 : 42;
    this.glow(mx, my, 120, "#d8db7040");
    this.ellipse(
      mx,
      my,
      moonRadius + magic * 5,
      moonRadius + magic * 5,
      "#f2d779",
    );
    this.ellipse(
      mx - 8,
      my - 8,
      moonRadius * 0.7,
      moonRadius * 0.68,
      "#f7e395",
    );
    this.ellipse(mx + 17, my + 13, 8, 9, "#d9bd6247");
    this.ellipse(mx - 9, my + 23, 5, 4, "#d9bd6247");
    this.ellipse(mx + 20, my - 14, 4, 4, "#d9bd6247");
    c.fillStyle = "#194645";
    c.beginPath();
    c.moveTo(0, h * 0.4);
    c.bezierCurveTo(w * 0.1, h * 0.21, w * 0.16, h * 0.5, w * 0.3, h * 0.4);
    c.bezierCurveTo(w * 0.45, h * 0.3, w * 0.46, h * 0.44, w * 0.6, h * 0.45);
    c.bezierCurveTo(w * 0.8, h * 0.23, w * 0.87, h * 0.29, w, h * 0.25);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    c.fillStyle = "#21574f";
    c.beginPath();
    c.moveTo(0, h * 0.62);
    c.bezierCurveTo(w * 0.2, h * 0.36, w * 0.22, h * 0.7, w * 0.39, h * 0.57);
    c.bezierCurveTo(w * 0.62, h * 0.45, w * 0.72, h * 0.55, w, h * 0.48);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    const water = c.createLinearGradient(0, h * 0.48, 0, h);
    water.addColorStop(0, "#225c5300");
    water.addColorStop(0.5, "#2b70624d");
    water.addColorStop(1, "#327c6c");
    c.fillStyle = water;
    c.fillRect(0, h * 0.48, w, h * 0.52);
    // Broken moonlight reflections.
    for (let i = 0; i < 10; i++) {
      const yy = h * 0.46 + i * 20;
      const xx = mx + Math.sin(i * 2 + t * 0.25) * 12;
      this.ellipse(
        xx,
        yy,
        10 + i * 2.9,
        1.5,
        "#b5c883" + (i % 2 ? "10" : "18"),
      );
    }
    for (let i = 0; i < 18; i++) {
      const yy = h * 0.45 + ((i * 47) % (h * 0.55));
      const xx = (i * 173 + 40) % w;
      this.ellipse(
        xx + Math.sin(t * 0.3 + i) * 4,
        yy,
        12 + (i % 3) * 7,
        1,
        "#94ccb320",
      );
    }
    // Stars and little fireflies, denser and brighter as the climb rises.
    for (let i = 0; i < 28 + Math.floor(magic * 18); i++) {
      const x = (i * 137.51 + 17) % w,
        y = (i * 79.37 + 52) % (h - 35);
      const pulse = 0.5 + Math.sin(t * 1.3 + i * 5) * 0.25;
      c.globalAlpha = this.reduced ? 0.65 : pulse;
      if (i % 4 === 0) {
        this.glow(x, y, 10, "#dbe99145");
        this.ellipse(x, y, 1.9, 1.9, "#edf6a2");
      } else {
        this.ellipse(x, y, 1.1, 1.1, "#b2dbb0");
      }
      c.globalAlpha = 1;
    }
    // Hanging willow silhouettes frame the scene without covering the path.
    c.strokeStyle = "#0d302d";
    c.lineWidth = 5;
    c.lineCap = "round";
    for (const flip of [false, true]) {
      c.save();
      if (flip) {
        c.translate(w, 0);
        c.scale(-1, 1);
      }
      c.beginPath();
      c.moveTo(-10, 8);
      c.quadraticCurveTo(20, 20, 94, -5);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 15,
          y = 12 - i * 2;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + 12, 35, x + 4, 55 + (i % 3) * 12);
        c.stroke();
        for (let j = 0; j < 3; j++) {
          this.ellipse(
            x + 6 + (j % 2 ? 3 : -1),
            y + 14 + j * 13,
            4,
            11,
            "#113e33",
            j % 2 ? -0.6 : 0.6,
          );
        }
      }
      c.restore();
    }
    // Far-bank lily pads and their quiet pink blossoms.
    for (let i = 0; i < 6; i++) {
      const x = i % 2 === 0 ? w * 0.075 + i * 7 : w * 0.88 - i * 3,
        y = h * 0.5 + i * 27;
      this.ellipse(x, y, 19, 4, "#397e60");
      this.ellipse(x, y + 6, 27, 1, "#71a78030");
      if (i === 2 || i === 5) {
        for (let j = 0; j < 5; j++)
          this.ellipse(
            x + (j - 2) * 3,
            y - 5,
            3.5,
            7,
            j % 2 ? "#d2a6a0" : "#e6b5ad",
            (j - 2) * 0.3,
          );
        this.ellipse(x, y - 3, 4, 2, "#f2d391");
      }
    }
  }
  pad(p: Pad) {
    const c = this.ctx,
      [x, y] = this.xy(p.x, p.y),
      s = this.scale;
    if (y < -50 || y > this.height + 50) return;
    const active = p.id === this.game.current && this.game.phase !== "ready";
    const sinking = active && (p.kind === "sink" || p.kind === "crumble");
    const fade = sinking ? Math.max(0.3, this.game.life) : 1;
    const ry = 15 * s * (sinking ? 0.65 + fade * 0.35 : 1),
      rx = (p.width / 2) * s;
    c.save();
    c.globalAlpha =
      this.game.phase === "ready" && p.id > 0
        ? 0.32
        : p.id < this.game.current
          ? 0.35
          : 1;
    this.ellipse(x, y + 10 * s, rx + 12 * s, 7 * s, "#0c3e3438");
    c.strokeStyle = "#96c9a838";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x, y + 10 * s, rx + 23 * s, 8 * s, 0, 0, TAU);
    c.stroke();
    const color =
      p.kind === "crumble"
        ? "#bea575"
        : p.kind === "sink"
          ? "#83bdae"
          : "#8dc875";
    this.ellipse(
      x,
      y + 4 * s,
      rx,
      ry,
      p.kind === "crumble"
        ? "#7b7450"
        : p.kind === "sink"
          ? "#3e8e82"
          : "#477f49",
    );
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0.14, TAU - 0.12);
    c.lineTo(x + rx * 0.5, y);
    c.closePath();
    c.fill();
    c.strokeStyle =
      p.kind === "crumble"
        ? "#e4c999"
        : p.kind === "sink"
          ? "#badbc0"
          : "#b4e18e";
    c.lineWidth = 1.5 * s;
    c.stroke();
    c.strokeStyle = p.kind === "crumble" ? "#82754e80" : "#497c4f80";
    c.lineWidth = 1 * s;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(x + rx * 0.46, y);
      c.quadraticCurveTo(
        x - rx * 0.1,
        y + i * 2 * s,
        x - rx * 0.65,
        y + i * 4 * s,
      );
      c.stroke();
    }
    if (p.kind === "crumble") {
      c.strokeStyle = "#776748";
      c.lineWidth = 2 * s;
      c.beginPath();
      c.moveTo(x - rx * 0.1, y - ry);
      c.lineTo(x + 3 * s, y - 3 * s);
      c.lineTo(x - 7 * s, y + 4 * s);
      c.lineTo(x + 3 * s, y + ry);
      c.stroke();
    } else if (p.kind === "drift" || p.kind === "sink") {
      c.fillStyle = p.kind === "drift" ? "#285b3e" : "#286b63";
      c.font = `800 ${18 * s}px Nunito, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(p.kind === "drift" ? "↔" : "↓", x - 2 * s, y - 1 * s);
    }
    if (active && !this.game.jump && !this.game.falling) {
      c.strokeStyle = this.game.life < 0.3 ? "#ffb69a" : "#d4e5a2";
      c.lineWidth = 2 * s;
      c.beginPath();
      c.ellipse(x, y, rx + 5 * s, ry + 4 * s, 0, 0, TAU * this.game.life);
      c.stroke();
    }
    if (p.fly) {
      const fy = y - 35 * s + Math.sin(this.reduced ? 0 : this.time * 3) * 4;
      this.glow(x, fy, 26 * s, "#f4d36170");
      this.ellipse(x - 7 * s, fy - 5 * s, 6 * s, 3 * s, "#fff6c8", -0.5);
      this.ellipse(x + 7 * s, fy - 5 * s, 6 * s, 3 * s, "#fff6c8", 0.5);
      this.ellipse(x, fy, 4 * s, 7 * s, "#ffd55c");
      c.strokeStyle = "#d6a03d";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - 3 * s, fy);
      c.lineTo(x + 3 * s, fy);
      c.stroke();
    }
    c.restore();
  }
  jar(x: number, y: number) {
    const c = this.ctx,
      pot = this.game.pot,
      s = this.scale * (0.66 + Math.min(pot / 12000, 0.36));
    const shaking =
      !this.reduced && pot >= 1500
        ? Math.sin(this.time * 18) * Math.min(2, pot / 3000)
        : 0;
    c.save();
    c.translate(x + shaking, y);
    c.scale(s, s);
    this.glow(0, 0, 44, pot ? "#ffdf6550" : "#ffdf6518");
    c.fillStyle = "#b08138";
    c.beginPath();
    c.roundRect(-16, -12, 32, 33, 10);
    c.fill();
    const glass = c.createLinearGradient(-16, 0, 16, 0);
    glass.addColorStop(0, "#e0b54f");
    glass.addColorStop(0.45, "#fbe088");
    glass.addColorStop(1, "#d39f3d");
    c.fillStyle = glass;
    c.beginPath();
    c.roundRect(-16, -15, 32, 32, 9);
    c.fill();
    c.fillStyle = "#89652f";
    c.beginPath();
    c.roundRect(-13, -22, 26, 8, 3);
    c.fill();
    this.ellipse(0, -21, 13, 3, "#f7d477");
    c.fillStyle = "#7b632d";
    c.font = "900 19px Nunito, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("₽", 0, 2);
    c.strokeStyle = "#fff4bf";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-10, -9);
    c.lineTo(-10, 3);
    c.stroke();
    c.restore();
  }
  foreground() {
    const c = this.ctx,
      h = this.height,
      w = this.width;
    for (const flip of [false, true]) {
      c.save();
      if (flip) {
        c.translate(w, 0);
        c.scale(-1, 1);
      }
      c.fillStyle = "#184c3b";
      c.beginPath();
      c.moveTo(-5, h + 2);
      c.quadraticCurveTo(11, h - 44, 81, h - 7);
      c.lineTo(100, h + 2);
      c.fill();
      for (let i = 0; i < 9; i++) {
        const x = 4 + i * 7,
          top = h - 38 - ((i * 17) % 65);
        c.strokeStyle = i % 2 ? "#2d6444" : "#28593d";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, h + 4);
        c.quadraticCurveTo(x - 4, top + 15, x + (i % 2 ? 8 : -8), top);
        c.stroke();
        if (i % 3 === 0) {
          c.strokeStyle = "#6b8250";
          c.lineWidth = 6;
          c.beginPath();
          c.moveTo(x - 8, top);
          c.lineTo(x - 9, top + 15);
          c.stroke();
        }
      }
      this.ellipse(50, h - 3, 31, 9, "#487e48", -0.3);
      this.ellipse(12, h - 12, 25, 10, "#3b7146", 0.6);
      c.restore();
    }
    const shade = c.createLinearGradient(0, h - 24, 0, h);
    shade.addColorStop(0, "#173b3200");
    shade.addColorStop(1, "#153d3644");
    c.fillStyle = shade;
    c.fillRect(0, h - 24, w, 24);
  }
  render(dt: number) {
    this.time += dt;
    this.background();
    const game = this.game;
    for (let i = game.pads.length - 1; i >= 0; i--) this.pad(game.pads[i]);
    const [x, y] = this.xy(game.x, game.y),
      s = this.scale;
    if (game.phase === "playing" && !game.jump && !game.falling) {
      const target =
        game.aim === Math.sign(game.next.x - game.x)
          ? game.next.x
          : game.x + game.aim * 120;
      const [tx, ty] = this.xy(target, game.next.y);
      this.ctx.save();
      this.ctx.strokeStyle = "#eaf3bf60";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([3, 7]);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 20 * s);
      this.ctx.quadraticCurveTo((x + tx) / 2, y - 190 * s, tx, ty - 8 * s);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.strokeStyle = "#eaf3bf90";
      this.ctx.beginPath();
      this.ctx.ellipse(tx, ty, 10 * s, 4 * s, 0, 0, TAU);
      this.ctx.stroke();
      this.ctx.restore();
    }
    const panic =
      game.falling ||
      (!game.jump && game.life < 0.28 && game.phase !== "ready");
    const sprite = panic
      ? this.panic
      : game.multiplier >= 3
        ? this.grin
        : this.frog;
    const bob =
      game.phase === "ready" && !this.reduced ? Math.sin(this.time * 2) * 2 : 0;
    const frogWidth = game.phase === "ready" ? 96 * s : 78 * s;
    if (sprite.complete && sprite.naturalWidth) {
      this.ctx.save();
      this.ctx.translate(x, y - 3 * s + bob);
      if (game.jump && !this.reduced)
        this.ctx.rotate(
          Math.sin(game.jump.progress * Math.PI) * game.aim * 0.09,
        );
      this.ctx.drawImage(
        sprite,
        -frogWidth / 2,
        -frogWidth * 0.87,
        frogWidth,
        frogWidth * 0.87,
      );
      this.ctx.restore();
    }
    if (!game.falling && game.phase !== "over")
      this.jar(x, y - frogWidth * 0.9 - 25 * s + bob);
    this.foreground();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life > p.max) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      this.ctx.globalAlpha = 1 - p.life / p.max;
      if (p.coin) {
        this.ellipse(p.x, p.y, 4, 6, "#f7d674", Math.sin(p.life * 10));
        this.ctx.strokeStyle = "#a5813c";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y - 2);
        this.ctx.lineTo(p.x, p.y + 2);
        this.ctx.stroke();
      } else this.ellipse(p.x, p.y, 3, 3, "#bce8bc");
      this.ctx.globalAlpha = 1;
    }
  }
}
