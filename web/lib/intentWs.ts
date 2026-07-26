// Intent MVP (contract v0) — parallel slice, separate from lib/ws.ts's
// SessionStream (which talks to the existing /sessions/{id}/stream Pipecat
// route). Reuses NEXT_PUBLIC_WS_BASE, the same env var SessionStream uses.

import type { CandidateAck, IntentBroadcast } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? "ws://localhost:8000";

export class CandidateSocket {
  private socket: WebSocket;
  private ackHandlers: ((ack: Extract<CandidateAck, { type: "ack" }>) => void)[] = [];
  private errorHandlers: ((message: string) => void)[] = [];

  constructor(sessionId: string) {
    this.socket = new WebSocket(`${WS_BASE}/ws/candidate/${sessionId}`);
    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("message", (msg) => {
      if (typeof msg.data !== "string") return;
      const parsed = JSON.parse(msg.data) as CandidateAck;
      if (parsed.type === "ack") {
        this.ackHandlers.forEach((h) => h(parsed));
      } else {
        this.errorHandlers.forEach((h) => h(parsed.message));
      }
    });
  }

  onAck(handler: (ack: Extract<CandidateAck, { type: "ack" }>) => void) {
    this.ackHandlers.push(handler);
  }

  onError(handler: (message: string) => void) {
    this.errorHandlers.push(handler);
  }

  /** Send one binary PCM16 frame — call from startMicCapture's onFrame while
   * the hold-to-talk button is down. No changes needed to lib/audio.ts. */
  sendAudioFrame(frame: ArrayBuffer) {
    this.socket.send(frame);
  }

  /** Call on button release — triggers the one-shot STT+translate+intent
   * pass on the backend. */
  sendStop() {
    this.socket.send(JSON.stringify({ type: "stop" }));
  }

  close() {
    this.socket.close();
  }
}

export class ConsoleSocket {
  private socket: WebSocket;
  private intentHandlers: ((broadcast: IntentBroadcast) => void)[] = [];

  constructor(sessionId: string) {
    this.socket = new WebSocket(`${WS_BASE}/ws/console/${sessionId}`);

    this.socket.addEventListener("message", (msg) => {
      if (typeof msg.data !== "string") return;
      const parsed = JSON.parse(msg.data) as IntentBroadcast;
      if (parsed.type === "intent") {
        this.intentHandlers.forEach((h) => h(parsed));
      }
    });
  }

  onIntent(handler: (broadcast: IntentBroadcast) => void) {
    this.intentHandlers.push(handler);
  }

  close() {
    this.socket.close();
  }
}
