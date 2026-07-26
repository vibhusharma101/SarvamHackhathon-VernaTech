"""WS /sessions/{id}/stream — event protocol frozen in TRD §4. This connects
directly from the browser to this host, never proxied through Vercel.

The handler below accepts the connection and dispatches the documented
control messages; the actual Pipecat pipeline wiring (STT streaming, TTS
playback, barge-in) is scaffolded in app/services/pipecat_pipeline.py and
left for the pipeline dev to attach here — see .vii/plan.md.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["ws"])


@router.websocket("/sessions/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message and message["bytes"] is not None:
                # TODO(pipeline dev): forward this 16kHz mono PCM frame into
                # the session's Pipecat STT input transport.
                continue

            if "text" in message and message["text"] is not None:
                import json

                event = json.loads(message["text"])
                event_type = event.get("type")

                if event_type == "start":
                    # TODO: build_stt(event["language"]) / build_tts() from
                    # pipecat_pipeline.py and start the pipeline for this session.
                    pass
                elif event_type == "clarification_request":
                    # TODO: tag the current turn `is_clarification=True`,
                    # rephrase the question, do not penalize (PRD M6).
                    pass
                elif event_type == "end":
                    await websocket.send_json({"type": "screen_complete", "session_id": session_id})
                    break
    except WebSocketDisconnect:
        # Persist everything server-side up to this point — a mid-demo
        # disconnect/refresh must lose nothing (TRD §12).
        return
