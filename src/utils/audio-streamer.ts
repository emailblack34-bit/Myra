/**
 * AudioStreamer is a utility to handle browser-side audio capture (microphone input)
 * and audio playback (for raw PCM chunks received from Gemini Live API).
 */
export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private onAudioInput: (base64: string) => void;

  constructor(onAudioInput: (base64: string) => void) {
    this.onAudioInput = onAudioInput;
  }

  /**
   * Starts capturing audio from the user's microphone.
   * Converted to 16kHz, mono, 16-bit raw signed PCM (little-endian) in Base64 format.
   */
  async startInput() {
    if (this.inputAudioCtx) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      // Try creating AudioContext with standard 16000Hz sample rate.
      try {
        this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      } catch (ctxErr) {
        console.warn("Could not create AudioContext with 16000Hz sample rate, falling back to default.", ctxErr);
        this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (!this.inputAudioCtx) {
        throw new Error("Failed to initialize AudioContext.");
      }

      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      
      // Use ScriptProcessorNode for universal browser compatibility in the sandboxed preview iframe
      this.processorNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(this.processorNode);
      this.processorNode.connect(this.inputAudioCtx.destination);

      const contextSampleRate = this.inputAudioCtx.sampleRate;

      this.processorNode.onaudioprocess = (e) => {
        if (!this.inputAudioCtx || !this.processorNode) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        let resampledData = inputData;

        // Resample dynamically if context is not 16000Hz
        if (contextSampleRate !== 16000) {
          resampledData = this.resample(inputData, contextSampleRate, 16000);
        }

        // Convert Float32 samples [-1.0, 1.0] to 16-bit signed PCM (Int16Array)
        const buffer = new ArrayBuffer(resampledData.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < resampledData.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, resampledData[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true); // true = little-endian
        }

        // Convert raw PCM buffer to Base64
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Trigger input callback
        this.onAudioInput(base64);
      };
    } catch (err) {
      console.error("Failed to start audio input recording:", err);
      this.stopInput();
      throw err;
    }
  }

  /**
   * Helper to resample Float32 array dynamically.
   */
  private resample(sourceArray: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return sourceArray;
    }
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(sourceArray.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const nextIndex = i * ratio;
      const index = Math.floor(nextIndex);
      const interpolation = nextIndex - index;
      if (index + 1 < sourceArray.length) {
        result[i] = sourceArray[index] * (1 - interpolation) + sourceArray[index + 1] * interpolation;
      } else {
        result[i] = sourceArray[index];
      }
    }
    return result;
  }

  /**
   * Stops microphone input capture and releases resources.
   */
  stopInput() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
  }

  /**
   * Initializes the AudioContext for output playback at 24000Hz (Gemini's audio output rate).
   */
  initPlayback() {
    if (!this.outputAudioCtx) {
      this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      this.nextStartTime = 0;
    }
    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume();
    }
  }

  /**
   * Enqueues and schedules a chunk of raw 24kHz 16-bit little-endian PCM audio.
   * Leverages precise timeline scheduling to guarantee click-free, gapless audio.
   */
  async playChunk(base64Data: string) {
    this.initPlayback();
    if (!this.outputAudioCtx) return;

    try {
      // Decode base64 to binary byte array
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Read binary PCM bytes into Int16Array, then normalize to Float32 [-1.0, 1.0]
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create browser AudioBuffer at 24kHz
      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        // Enforce a small buffer (80ms) to compensate for network latency/jitter
        this.nextStartTime = currentTime + 0.08;
      }

      // Schedule at the exact next start time slot
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      // Keep track of active source node to enable immediate cancellation upon interruption
      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
      };
    } catch (e) {
      console.error("Error scheduling audio chunk for playback:", e);
    }
  }

  /**
   * Immediately stops all currently playing or scheduled audio buffers.
   * Useful when the user interrupts the assistant.
   */
  clearPlaybackQueue() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source already ended or failed to stop
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  /**
   * Stops both input capture and output playback. Cleans up all audio contexts.
   */
  stop() {
    this.stopInput();
    this.clearPlaybackQueue();
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
  }
}
