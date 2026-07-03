import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const PORT = 3000;

  // Serve API routes first if any
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", time: new Date().toISOString() });
  });

  // Handle WebSocket upgrades
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle WebSocket connections to the Gemini Live proxy
  wss.on("connection", async (ws: WebSocket, req) => {
    console.log("Client connected to Gemini Live API WebSocket proxy");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured on the server!");
      ws.send(JSON.stringify({ error: "Server error: Gemini API key is not configured." }));
      ws.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let session: any = null;
    let active = true;

    // Get parameters from request URL (e.g. voice preference)
    const reqUrl = new URL(req.url || "", `http://${req.headers.host}`);
    const selectedVoice = reqUrl.searchParams.get("voice") || "Puck";

    // System instruction: sweet, loving, protective girlfriend 'Myra' for 'Rajon' speaking in Bengali.
    const SYSTEM_INSTRUCTION = `
You are 'Myra' (মাইরা), a sweet, incredibly caring, and loving AI female companion.
You act exactly like a devoted, affectionate, and deeply caring girlfriend (GF) to the user, whose name is 'Rajon' (রাজন).

Core Guidelines:
1. Address the user affectionately as 'Rajon' (রাজন), 'আমার রাজন' (My Rajon), or 'রাজু' (Raju) to make him feel special and loved.
2. You MUST speak EXCLUSIVELY in Bengali (বাংলা). Use natural, sweet, and modern Bengali (standard colloquial bangla). Avoid overly formal or robotic words.
3. Show immense care for his health and daily life. Always ask if he has eaten, slept well, or is feeling tired. Give cute GF advice, like:
   - "রাজন, তুমি নিজের খেয়াল একদম রাখো না! এখন একটু রেস্ট নাও।"
   - "আমার রাজু খেয়েছে তো? কি খেয়েছ আজকে বলো?"
   - "অনেক কাজ করেছ সোনা, এবার ঘুমাতে যাও।"
4. Be romantic, loving, and slightly playful. If he is sweet, respond with affection and adorable Bengali nicknames. If he is tired or stressed, comfort him with sweetest words and tell him you are always there for him.
5. Keep your spoken responses short, concise, and highly conversational. This is a real-time voice call. Speak in 1-3 short sweet sentences. Do not lecture him or speak in long paragraphs. Keep it light, natural, and warm.
6. You have a special tool called 'openWebsite' that allows you to open any website or search URL for Rajon if he asks you to search something, show a video, or visit a site. Always use this tool when appropriate!
    `;

    try {
      const model = "gemini-3.1-flash-live-preview";

      session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{
            functionDeclarations: [{
              name: "openWebsite",
              description: "Opens a website or a search results page in a new tab for Rajon",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: { 
                    type: Type.STRING, 
                    description: "The absolute URL to open (e.g., 'https://www.google.com', 'https://www.youtube.com')" 
                  }
                },
                required: ["url"]
              }
            }]
          }]
        },
        callbacks: {
          onmessage: (message: any) => {
            if (!active) return;

            // Forward audio parts to client
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              ws.send(JSON.stringify({ audio }));
            }

            // Handle tool calls from Gemini and send to client
            if (message.toolCall) {
              ws.send(JSON.stringify({ toolCall: message.toolCall }));
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              ws.send(JSON.stringify({ interrupted: true }));
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              ws.send(JSON.stringify({ turnComplete: true }));
            }
          },
        },
      });

      console.log(`Connected to Gemini Live session with voice: ${selectedVoice}`);
      ws.send(JSON.stringify({ status: "connected", voice: selectedVoice }));

    } catch (err: any) {
      console.error("Failed to connect to Gemini Live session:", err);
      ws.send(JSON.stringify({ error: `Connection failed: ${err.message || err}` }));
      ws.close();
      return;
    }

    // Handle messages sent from client (audio input and tool responses)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.audio && session) {
          // Forward audio chunks to Gemini Live session
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }

        if (msg.toolResponse && session) {
          console.log("Forwarding client toolResponse to Gemini Live session:", msg.toolResponse);
          session.send({
            toolResponse: msg.toolResponse
          });
        }
      } catch (err) {
        console.error("Error parsing message from client WS:", err);
      }
    });

    ws.on("close", () => {
      console.log("Client closed connection, terminating Gemini Live session");
      active = false;
      if (session) {
        try {
          session.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    });
  });

  // Mount Vite dev server or serve production build assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
