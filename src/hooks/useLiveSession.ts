import { useState, useRef, useEffect } from "react";
import { AudioStreamer } from "../utils/audio-streamer";

export type SessionState = "idle" | "connecting" | "connected" | "error";

export function useLiveSession() {
  const [state, setState] = useState<SessionState>("idle");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("Aoede");

  const streamerRef = useRef<AudioStreamer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = async (voiceName: string = "Aoede") => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setError(null);
    setState("connecting");
    setSelectedVoice(voiceName);

    try {
      // Create and initialize the audio streamer
      const streamer = new AudioStreamer((base64PCM) => {
        // Send base64 audio to our server-side WebSocket proxy
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ audio: base64PCM }));
        }
      });
      streamerRef.current = streamer;

      // Detect protocol (ws vs wss) based on page hosting
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socketUrl = `${protocol}//${window.location.host}/api/live?voice=${encodeURIComponent(voiceName)}`;
      
      console.log(`Connecting to voice assistant proxy at: ${socketUrl}`);
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("WebSocket connection established with server");
        try {
          await streamer.startInput();
          setState("connected");
        } catch (audioErr: any) {
          console.error("Failed to start mic capture:", audioErr);
          setError("Microphone access is required for the voice assistant. Please check permissions.");
          setState("error");
          disconnect();
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.status === "connected") {
            console.log("Gemini session connected on backend");
          }

          if (msg.error) {
            setError(msg.error);
            setState("error");
            disconnect();
          }

          // Handle incoming audio data from Gemini
          if (msg.audio) {
            setIsSpeaking(true);
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }

            await streamer.playChunk(msg.audio);

            // Debounce the speaking state: if no audio is played for 1.5 seconds, set speaking to false
            speakingTimeoutRef.current = setTimeout(() => {
              setIsSpeaking(false);
            }, 1500);
          }

          // Handle server-side user interruption
          if (msg.interrupted) {
            console.log("User interrupted, stopping voice playback immediately");
            streamer.clearPlaybackQueue();
            setIsSpeaking(false);
            if (speakingTimeoutRef.current) {
              clearTimeout(speakingTimeoutRef.current);
            }
          }

          // Handle client-side Tool / Function Calling
          if (msg.toolCall) {
            const { functionCalls } = msg.toolCall;
            if (functionCalls && functionCalls.length > 0) {
              const functionResponses = [];

              for (const call of functionCalls) {
                console.log("Executing tool call requested by Gemini Live:", call);
                if (call.name === "openWebsite") {
                  const url = call.args?.url;
                  if (url) {
                    try {
                      // Attempt to safely open in a new window/tab
                      window.open(url, "_blank");
                      functionResponses.push({
                        response: { output: { success: true, openedUrl: url } },
                        id: call.id
                      });
                    } catch (openErr) {
                      console.error("Failed to open website:", openErr);
                      functionResponses.push({
                        response: { output: { success: false, error: "Pop-up was blocked or failed to open." } },
                        id: call.id
                      });
                    }
                  } else {
                    functionResponses.push({
                      response: { output: { success: false, error: "No URL parameter provided." } },
                      id: call.id
                    });
                  }
                }
              }

              // Send response back via WebSocket to server proxy
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && functionResponses.length > 0) {
                wsRef.current.send(JSON.stringify({
                  toolResponse: { functionResponses }
                }));
              }
            }
          }

          if (msg.turnComplete) {
            // Re-assert listening status
            console.log("Turn completed by assistant");
          }
        } catch (err) {
          console.error("Error processing websocket message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed", event);
        if (state !== "error" && state !== "connecting") {
          setState("idle");
        }
        cleanup();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Network error connecting to assistant server.");
        setState("error");
        cleanup();
      };

    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to initialize voice assistant session.");
      setState("error");
      cleanup();
    }
  };

  const cleanup = () => {
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    setIsSpeaking(false);
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setState("idle");
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    state,
    isSpeaking,
    error,
    selectedVoice,
    connect,
    disconnect,
  };
}
