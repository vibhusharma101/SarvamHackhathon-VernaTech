// Mic capture -> 16kHz mono PCM frames, ~100-200ms chunks (TRD §3.2).
// Saaras v3 streaming WS accepts WAV/PCM only, never MP3/WebM (TRD §12).

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_MS = 150;

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export interface MicCaptureHandle {
  stop: () => void;
}

/** Starts mic capture and invokes onFrame with raw 16-bit PCM ArrayBuffers
 * roughly every CHUNK_MS. Requires a secure context (https or localhost). */
export async function startMicCapture(onFrame: (frame: ArrayBuffer) => void): Promise<MicCaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: TARGET_SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
  });

  const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(stream);

  const bufferSize = Math.pow(2, Math.round(Math.log2((audioContext.sampleRate * CHUNK_MS) / 1000)));
  // ScriptProcessorNode is deprecated in favor of AudioWorklet, but it's the
  // simplest thing that works within a 6-hour build window (TRD build plan) —
  // swap for an AudioWorklet post-hackathon if this ships past the demo.
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  processor.onaudioprocess = (event) => {
    const channelData = event.inputBuffer.getChannelData(0);
    onFrame(floatTo16BitPCM(channelData));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close();
    },
  };
}

/** Decodes a base64 PCM/WAV payload from an `agent_speaking` event and plays it. */
export async function playBase64Audio(base64: string): Promise<void> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}
