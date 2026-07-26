// Fixed 4-question rubric interview flow — separate from lib/intentWs.ts's
// freeform Intent MVP slice and lib/ws.ts's Pipecat SessionStream. Talks to
// /ws/interview/{sessionId}, which drives the candidate through the fixed
// question list and scores the session for real once all 4 are answered.

import type { InterviewServerEvent } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? "ws://localhost:8000";

type QuestionEvent = Extract<InterviewServerEvent, { type: "question" }>;
type AckEvent = Extract<InterviewServerEvent, { type: "ack" }>;
type CompleteEvent = Extract<InterviewServerEvent, { type: "complete" }>;

export class InterviewSocket {
  private socket: WebSocket;
  private openHandlers: (() => void)[] = [];
  private questionHandlers: ((q: QuestionEvent) => void)[] = [];
  private ackHandlers: ((ack: AckEvent) => void)[] = [];
  private errorHandlers: ((message: string) => void)[] = [];
  private completeHandlers: ((c: CompleteEvent) => void)[] = [];

  constructor(sessionId: string) {
    this.socket = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`);
    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("open", () => this.openHandlers.forEach((h) => h()));

    this.socket.addEventListener("message", (msg) => {
      if (typeof msg.data !== "string") return;
      const event = JSON.parse(msg.data) as InterviewServerEvent;
      switch (event.type) {
        case "question":
          this.questionHandlers.forEach((h) => h(event));
          break;
        case "ack":
          this.ackHandlers.forEach((h) => h(event));
          break;
        case "error":
          this.errorHandlers.forEach((h) => h(event.message));
          break;
        case "complete":
          this.completeHandlers.forEach((h) => h(event));
          break;
      }
    });
  }

  /** The socket starts in CONNECTING state — sends throw synchronously if
   * called before it's actually open. */
  onOpen(handler: () => void) {
    if (this.socket.readyState === WebSocket.OPEN) handler();
    else this.openHandlers.push(handler);
  }

  onQuestion(handler: (q: QuestionEvent) => void) {
    this.questionHandlers.push(handler);
  }

  onAck(handler: (ack: AckEvent) => void) {
    this.ackHandlers.push(handler);
  }

  onError(handler: (message: string) => void) {
    this.errorHandlers.push(handler);
  }

  onComplete(handler: (c: CompleteEvent) => void) {
    this.completeHandlers.push(handler);
  }

  sendAudioFrame(frame: ArrayBuffer) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(frame);
  }

  sendStop() {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "stop" }));
    }
  }

  close() {
    this.socket.close();
  }
}
