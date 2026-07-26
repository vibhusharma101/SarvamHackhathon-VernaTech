// WS client for /sessions/{id}/stream — protocol frozen in TRD §4.
// Connects directly to the Railway/Render host, NOT proxied through Vercel
// (WebSockets do not proxy through Vercel — TRD §1).

import type { ClientEvent, ServerEvent, SpokenLanguage } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE ?? "ws://localhost:8000";

export interface SessionStreamHandlers {
  onTranscript?: (e: Extract<ServerEvent, { type: "transcript" }>) => void;
  onAgentSpeaking?: (e: Extract<ServerEvent, { type: "agent_speaking" }>) => void;
  onBargeInAck?: () => void;
  onTurnComplete?: (e: Extract<ServerEvent, { type: "turn_complete" }>) => void;
  onScreenComplete?: (e: Extract<ServerEvent, { type: "screen_complete" }>) => void;
  onError?: (e: Extract<ServerEvent, { type: "error" }>) => void;
}

export class SessionStream {
  private socket: WebSocket;

  constructor(sessionId: string, language: SpokenLanguage, handlers: SessionStreamHandlers) {
    this.socket = new WebSocket(`${WS_BASE}/sessions/${sessionId}/stream`);
    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("open", () => {
      this.sendEvent({ type: "start", session_id: sessionId, language });
    });

    this.socket.addEventListener("message", (msg) => {
      if (typeof msg.data !== "string") return; // binary frames are audio the server never sends us this way today
      const event = JSON.parse(msg.data) as ServerEvent;
      switch (event.type) {
        case "transcript":
          handlers.onTranscript?.(event);
          break;
        case "agent_speaking":
          handlers.onAgentSpeaking?.(event);
          break;
        case "barge_in_ack":
          handlers.onBargeInAck?.();
          break;
        case "turn_complete":
          handlers.onTurnComplete?.(event);
          break;
        case "screen_complete":
          handlers.onScreenComplete?.(event);
          break;
        case "error":
          handlers.onError?.(event);
          break;
      }
    });
  }

  sendEvent(event: ClientEvent) {
    this.socket.send(JSON.stringify(event));
  }

  sendAudioFrame(frame: ArrayBuffer) {
    this.socket.send(frame);
  }

  requestClarification() {
    this.sendEvent({ type: "clarification_request" });
  }

  end() {
    this.sendEvent({ type: "end" });
  }

  close() {
    this.socket.close();
  }
}
