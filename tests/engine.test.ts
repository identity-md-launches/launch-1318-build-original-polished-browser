import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, multiplierFor, nextCombo, padLife } from "../src/engine.ts";
import { RecordStore, markDay } from "../src/storage.ts";
const advance = (game: Game, seconds: number) => {
  for (let i = 0; i < Math.ceil(seconds * 100); i++) game.update(0.01);
};
const create = () => {
  const game = new Game(() => 0.5);
  game.reset();
  return game;
};
const land = (game: Game) => {
  game.next.kind = "lily";
  game.update(0);
  game.hop(Math.sign(game.next.x - game.x) as -1 | 1);
  advance(game, 0.6);
};

test("first hop lands on the next pad and only scores unbanked coins", () => {
  const game = create();
  land(game);
  assert.equal(game.height, 1);
  assert.equal(game.current, 1);
  assert.equal(game.pot, 100);
  assert.equal(game.score, 0);
  assert.equal(game.combo, 1);
});
test("combos use each milestone; bank resets combo and awards the daily bonus once", () => {
  const game = create();
  land(game);
  land(game);
  assert.equal(game.multiplier, 2);
  assert.equal(game.pot, 300);
  assert.equal(game.bank(), 325);
  assert.equal(game.score, 325);
  assert.equal(game.pot, 0);
  assert.equal(game.combo, 0);
  assert.equal(game.multiplier, 1);
  assert.equal(game.bank(), 0);
  land(game);
  assert.equal(game.bank(), 100);
  assert.equal(game.score, 425);
  assert.deepEqual(
    [0, 2, 5, 9, 14, 20, 28, 40].map(multiplierFor),
    [1, 2, 3, 5, 8, 10, 15, 20],
  );
  assert.deepEqual(nextCombo(19), { pads: 20, value: 10 });
});
test("a wrong-direction hop falls and loses only the unbanked pot", () => {
  const game = create();
  land(game);
  game.bank();
  land(game);
  const lost = game.pot;
  game.hop(-Math.sign(game.next.x - game.x) as -1 | 1);
  advance(game, 1.5);
  assert.equal(game.phase, "over");
  assert.equal(game.pot, 0);
  assert.equal(game.lost, lost);
  assert.equal(game.score, 125);
  assert.equal(game.height, 2);
});
test("bank works in flight and in the last moment before a splash", () => {
  const game = create();
  land(game);
  game.hop();
  assert.equal(game.bank(), 125);
  advance(game, 0.6);
  game.pot = 500;
  game.fall();
  assert.equal(game.bank(), 500);
  advance(game, 1);
  assert.equal(game.score, 625);
  assert.equal(game.lost, 0);
});
test("sinkers and crumblers have distinct lifetimes and end a stalled run", () => {
  for (const kind of ["sink", "crumble"] as const) {
    const game = create();
    land(game);
    game.pad.kind = kind;
    const lifetime = padLife(game.pad);
    advance(game, lifetime + 0.05);
    assert.ok(game.falling);
    advance(game, 0.8);
    assert.equal(game.phase, "over");
  }
  assert.ok(
    padLife({ ...create().next, kind: "crumble" }) <
      padLife({ ...create().next, kind: "sink" }),
  );
});
test("drifting pads speed up at higher levels while remaining bounded", () => {
  const game = create();
  game.next.kind = "drift";
  const initial = game.next.x;
  advance(game, 0.2);
  assert.notEqual(game.next.x, initial);
  assert.ok(Math.abs(game.next.x - game.next.baseX) <= 44);
});
test("golden flies double the accumulated pot and cannot be caught twice", () => {
  const game = create();
  game.next.fly = true;
  land(game);
  assert.equal(game.pot, 200);
  assert.equal(game.flyCount, 1);
  assert.equal(game.pad.fly, false);
  assert.equal(game.events.filter((e) => e.type === "fly").length, 1);
});
test("pause freezes all game clocks, positions and inputs; resume continues", () => {
  const game = create();
  game.hop(-1);
  advance(game, 0.2);
  game.pause();
  const state = JSON.stringify(game);
  advance(game, 10);
  assert.equal(JSON.stringify(game), state);
  assert.equal(game.hop(), false);
  assert.equal(game.bank(), 0);
  game.resume();
  advance(game, 0.5);
  assert.equal(game.height, 1);
});
test("moonset ends at 75 seconds and leaves banked score intact", () => {
  const game = create();
  game.elapsed = 74.98;
  game.score = 1234;
  game.pot = 900;
  advance(game, 0.05);
  assert.equal(game.phase, "over");
  assert.equal(game.reason, "Moonset");
  assert.equal(game.score, 1234);
  assert.equal(game.lost, 900);
});
test("restart resets the run and generates a reachable continuing ladder", () => {
  const game = create();
  for (let i = 0; i < 60; i++) {
    land(game);
    assert.equal(game.height, i + 1);
    assert.ok(game.next);
    assert.ok(Math.abs(game.next.baseX - game.pad.baseX) < 150);
  }
  assert.ok(game.pads.length >= 69);
  game.finish("Test");
  game.reset(75);
  assert.equal(game.phase, "playing");
  assert.equal(game.height, 0);
  assert.equal(game.pot, 0);
  assert.equal(game.score, 0);
  assert.equal(game.elapsed, 0);
  assert.equal(game.bonus, 75);
});
test("storage denial and corrupt records are safe, retaining session bests", () => {
  for (const storage of [
    null,
    {
      getItem() {
        throw Error("SecurityError");
      },
      setItem() {
        throw Error("SecurityError");
      },
    },
  ]) {
    const store = new RecordStore(storage);
    assert.equal(store.persistent, false);
    assert.equal(store.play(new Date(2026, 9, 11)), 25);
    store.finish(500, 12);
    assert.equal(store.value.bestScore, 500);
    store.finish(50, 3);
    assert.equal(store.value.bestHeight, 12);
  }
  const store = new RecordStore({ getItem: () => "{bad", setItem() {} });
  assert.equal(store.value.bestScore, 0);
  assert.equal(store.persistent, true);
  const bad = new RecordStore({
    getItem: () =>
      JSON.stringify({
        bestScore: -1,
        bestHeight: "evil",
        streak: NaN,
        sound: true,
      }),
    setItem() {},
  });
  assert.equal(bad.value.bestScore, 0);
  assert.equal(bad.value.bestHeight, 0);
  assert.equal(bad.value.sound, true);
});
test("daily streak counts once per local day, crosses months, and resets after a missed day", () => {
  const seed = {
    bestScore: 0,
    bestHeight: 0,
    streak: 2,
    lastDay: "2026-09-30",
    sound: false,
  };
  const next = markDay(seed, new Date(2026, 9, 1));
  assert.equal(next.streak, 3);
  assert.equal(markDay(next, new Date(2026, 9, 1, 23)).streak, 3);
  assert.equal(markDay(next, new Date(2026, 9, 3)).streak, 1);
  const leap = markDay(
    { ...seed, lastDay: "2028-02-29" },
    new Date(2028, 2, 1),
  );
  assert.equal(leap.streak, 3);
});
test("a persistent record round-trips score, height and sound without a service", () => {
  const memory = new Map();
  const storage = {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  const a = new RecordStore(storage);
  a.play(new Date(2026, 9, 11));
  a.finish(4500, 22);
  a.value.sound = true;
  a.save();
  const b = new RecordStore(storage);
  assert.equal(b.persistent, true);
  assert.equal(b.value.bestScore, 4500);
  assert.equal(b.value.bestHeight, 22);
  assert.equal(b.value.sound, true);
});

test("100 seeded runs terminate safely with a measured difficulty ramp", () => {
  const runs: { seconds: number; height: number }[] = [];
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const game = new Game(() => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    });
    game.reset();
    let ticks = 0;
    while (game.phase === "playing" && ticks++ < 7600) {
      if (!game.jump && !game.falling && game.standing > 0.45)
        game.hop(Math.sign(game.next.x - game.x) as -1 | 1);
      if (game.pot > 2500) game.bank();
      game.update(0.01);
    }
    assert.equal(game.phase, "over");
    assert.ok(Number.isSafeInteger(game.score) && game.score >= 0);
    runs.push({ seconds: Math.round(game.elapsed), height: game.height });
  }
  const mean = runs.reduce((sum, run) => sum + run.seconds, 0) / runs.length;
  assert.ok(mean >= 30 && mean <= 75, `Scripted mean duration: ${mean}s`);
  console.log(
    JSON.stringify({
      pacing: {
        runs: runs.length,
        minSeconds: Math.min(...runs.map((r) => r.seconds)),
        maxSeconds: Math.max(...runs.map((r) => r.seconds)),
        meanSeconds: mean,
        meanHeight: runs.reduce((sum, r) => sum + r.height, 0) / runs.length,
      },
    }),
  );
});
