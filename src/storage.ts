export interface Records {
  bestScore: number;
  bestHeight: number;
  streak: number;
  lastDay: string;
  sound: boolean;
}
const defaults = (): Records => ({
  bestScore: 0,
  bestHeight: 0,
  streak: 0,
  lastDay: "",
  sound: false,
});
const KEY = "pepe-ladder-v1";
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function markDay(records: Records, now = new Date()): Records {
  const today = dayKey(now);
  if (records.lastDay === today) return records;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return {
    ...records,
    streak:
      records.lastDay === dayKey(yesterday)
        ? Math.min(9999, records.streak + 1)
        : 1,
    lastDay: today,
  };
}
export class RecordStore {
  persistent = true;
  value = defaults();
  private storage: Pick<Storage, "getItem" | "setItem"> | null;
  constructor(storage: Pick<Storage, "getItem" | "setItem"> | null) {
    this.storage = storage;
    try {
      if (!storage) throw new Error("No storage");
      let raw: unknown = null;
      const serialized = storage.getItem(KEY);
      try {
        raw = JSON.parse(serialized || "null");
      } catch {
        /* Discard a corrupt record; the storage itself can still work. */
      }
      const data = raw as Partial<Records> | null;
      if (data && typeof data === "object") {
        for (const key of ["bestScore", "bestHeight", "streak"] as const)
          if (
            typeof data[key] === "number" &&
            Number.isSafeInteger(data[key]) &&
            data[key]! >= 0
          )
            this.value[key] = data[key]!;
        if (
          typeof data.lastDay === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(data.lastDay)
        )
          this.value.lastDay = data.lastDay;
        this.value.sound = data.sound === true;
      }
      this.save();
    } catch {
      this.persistent = false;
    }
  }
  save() {
    try {
      if (!this.storage) throw new Error("No storage");
      this.storage.setItem(KEY, JSON.stringify(this.value));
    } catch {
      this.persistent = false;
    }
  }
  play(now = new Date()) {
    this.value = markDay(this.value, now);
    this.save();
    return Math.min(7, this.value.streak) * 25;
  }
  finish(score: number, height: number) {
    this.value.bestScore = Math.max(this.value.bestScore, score);
    this.value.bestHeight = Math.max(this.value.bestHeight, height);
    this.save();
  }
}
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
