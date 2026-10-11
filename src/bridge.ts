export interface BridgeMessage {
  protocol: "pepe-game/1";
  type: string;
  channel: string;
  score?: number;
}
export function connectBridge(pause: () => void, resume: () => void) {
  let channel: string | null = null;
  function receive(event: MessageEvent) {
    if (
      window.parent === window ||
      event.source !== window.parent ||
      event.data?.protocol !== "pepe-game/1"
    )
      return;
    const m = event.data;
    if (
      m.type === "init" &&
      typeof m.channel === "string" &&
      m.channel.length > 0 &&
      m.channel.length <= 200
    ) {
      channel = m.channel;
      window.parent.postMessage(
        { protocol: "pepe-game/1", type: "ready", channel },
        "*",
      );
    }
    if (!channel || m.channel !== channel) return;
    if (m.type === "pause") pause();
    if (m.type === "resume" && !document.hidden) resume();
  }
  window.addEventListener("message", receive);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  return {
    score(score: number) {
      if (channel && Number.isSafeInteger(score) && score >= 0)
        window.parent.postMessage(
          { protocol: "pepe-game/1", type: "score", channel, score },
          "*",
        );
    },
  };
}
