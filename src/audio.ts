export class PondAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = false;
  active = false;
  beat = 0;
  tick = 0;
  async gesture() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      this.enabled = false;
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) void this.gesture();
    else if (this.context) void this.context.suspend().catch(() => {});
  }
  setActive(active: boolean) {
    this.active = active;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        active ? 0.16 : 0,
        this.context.currentTime,
        0.04,
      );
  }
  tone(
    frequency: number,
    duration = 0.15,
    type: OscillatorType = "sine",
    delay = 0,
    volume = 0.3,
  ) {
    const c = this.context;
    if (
      !this.enabled ||
      !this.active ||
      !c ||
      c.state !== "running" ||
      !this.master
    )
      return;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    const start = c.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  effect(type: string) {
    if (type === "hop") {
      this.tone(420, 0.09, "sine");
      this.tone(650, 0.12, "sine", 0.06);
    }
    if (type === "land") this.tone(330, 0.12, "triangle");
    if (type === "bank")
      [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
        this.tone(n, 0.3, "triangle", i * 0.065, 0.5),
      );
    if (type === "fly")
      [880, 1174.66, 1567.98].forEach((n, i) =>
        this.tone(n, 0.2, "sine", i * 0.09),
      );
    if (type === "fall")
      [220, 146.83, 98].forEach((n, i) => this.tone(n, 0.2, "sine", i * 0.12));
  }
  update(dt: number, pot: number, height: number) {
    if (!this.active || !this.enabled) return;
    this.tick += dt;
    const interval = Math.max(
      0.19,
      0.52 - Math.min(pot, 10000) / 33000 - height * 0.002,
    );
    if (this.tick < interval) return;
    this.tick = 0;
    this.beat++;
    const notes = [261.63, 329.63, 392, 493.88, 523.25, 392, 329.63, 293.66];
    this.tone(notes[this.beat % 8], 0.34, "sine", 0, 0.13);
    if (this.beat % 4 === 0) this.tone(130.81, 0.55, "triangle", 0, 0.1);
    if (pot >= 2000 && this.beat % 2 === 0) {
      this.tone(58, 0.14, "sine", 0, 0.8);
      this.tone(52, 0.12, "sine", 0.16, 0.55);
    }
  }
}
