import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  MicOff, 
  Settings, 
  AlertCircle,
  HelpCircle,
  Info,
  X,
  Sparkles,
  Smile,
  Heart
} from "lucide-react";
import { useLiveSession } from "./hooks/useLiveSession";

export default function App() {
  const {
    state,
    isSpeaking,
    error,
    selectedVoice,
    connect,
    disconnect
  } = useLiveSession();

  const [showSettings, setShowSettings] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [voiceName, setVoiceName] = useState("Aoede");
  const [currentTime, setCurrentTime] = useState("");

  // Update current time continuously
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleConnection = () => {
    if (state === "connected" || state === "connecting") {
      disconnect();
    } else {
      connect(voiceName);
    }
  };

  // Sample prompt ideas for Rajon to talk with Myra (written in Romanized Bengali for clean look)
  const promptIdeas = [
    { title: "Greeting", text: "Kemon acho Myra? (How are you, Myra?)" },
    { title: "Food Check", text: "Myra, khabar kheyecho? (Myra, have you eaten?)" },
    { title: "Feeling Tired", text: "Ami onek klanto aajke (I'm very tired today, Myra)" },
    { title: "Feeling Unwell", text: "Myra, bhalo lagche na (Myra, I am not feeling good)" },
    { title: "Express Love", text: "Ami tomake bhalobashi Myra! (I love you, Myra!)" },
    { title: "Compliment", text: "Myra, tumi ondor sundor (Myra, you are so beautiful)" }
  ];

  // Available voices
  const availableVoices = [
    { id: "Aoede", name: "Aoede (Sweet & Playful)", description: "Premium sweet, clear, and high-pitched voice. Highly recommended!" },
    { id: "Kore", name: "Kore (Soft & Warm)", description: "A quiet, caring, and deep female voice full of comfort." },
    { id: "Puck", name: "Puck (Energetic & Fun)", description: "A high-pitched, lively and playful voice with full attitude." }
  ];

  return (
    <div className="min-h-screen bg-[#060304] text-[#f8f1ed] flex flex-col justify-between font-mono relative overflow-hidden antialiased select-none">
      
      {/* Decorative subtle atmospheric backglow (matches image color palette) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#df1a3c]/3 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Main Header Container */}
      <div className="w-full max-w-lg mx-auto px-6 pt-8 z-10">
        <div className="flex justify-between items-end pb-3 border-b border-[#2d1b1e]/60">
          
          {/* Left Column stats */}
          <div className="flex gap-6 text-[10px] uppercase tracking-widest text-left">
            <div>
              <div className="text-[#6c6568]">Bat:</div>
              <div className="text-[#df1a3c] font-bold mt-0.5">100%</div>
            </div>
            <div>
              <div className="text-[#6c6568]">Mem:</div>
              <div className="text-[#968e92] font-bold mt-0.5">12.4GB</div>
            </div>
          </div>

          {/* Centered Myra Companion Brand */}
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-black tracking-[0.4em] text-[#df1a3c] ml-[0.4em]">
              MYRA
            </h1>
            <span className="text-[8px] tracking-[0.6em] text-[#6c6568] uppercase font-bold mt-1">
              AI Companion
            </span>
          </div>

          {/* Right Column details */}
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold tracking-wider text-[#df1a3c]">
              {currentTime || "21:14"}
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                showSettings 
                  ? "border-[#df1a3c] bg-[#df1a3c]/15 text-[#df1a3c]" 
                  : "border-[#2d1b1e] hover:border-[#6c6568]/40 bg-white/[0.02] text-[#968e92]"
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Stage & Physical Glass Orb Sphere */}
      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-6 flex flex-col justify-center items-center gap-10 relative z-10">
        
        {/* Core Sphere Area */}
        <div className="relative flex items-center justify-center">
          
          {/* Outer glowing ring when connected */}
          {state === "connected" && (
            <motion.div 
              animate={{
                scale: isSpeaking ? [1, 1.05, 1] : [1, 1.02, 1],
                opacity: isSpeaking ? [0.15, 0.3, 0.15] : [0.08, 0.15, 0.08]
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute w-80 h-80 bg-[#df1a3c] rounded-full blur-[40px] pointer-events-none"
            />
          )}

          {/* Physical 3D Spherical Glass Orb */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToggleConnection}
            className="relative w-72 h-72 rounded-full bg-gradient-to-br from-[#2a2327] via-[#100b0d] to-[#040203] shadow-[inset_15px_15px_30px_rgba(255,255,255,0.06),_inset_-15px_-15px_30px_rgba(0,0,0,0.8),_0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden cursor-pointer flex items-center justify-center"
          >
            {/* Top-left specular light shine spotlight */}
            <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-[6px] pointer-events-none" />

            {/* Inner dynamic pulsing aura when speaking */}
            {state === "connected" && (
              <motion.div 
                animate={isSpeaking ? {
                  scale: [1, 1.15, 0.95, 1.1, 1],
                  opacity: [0.6, 0.9, 0.5, 0.8, 0.6]
                } : {
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.45, 0.3]
                }}
                transition={{ repeat: Infinity, duration: isSpeaking ? 1.2 : 3, ease: "easeInOut" }}
                className="absolute w-24 h-24 rounded-full bg-[#df1a3c]/20 blur-xl pointer-events-none"
              />
            )}
            
            {/* Minimal glowing icon inside core when state is connected */}
            {state === "connected" && (
              <Heart className={`w-8 h-8 ${isSpeaking ? "text-[#df1a3c] fill-[#df1a3c] animate-pulse" : "text-white/20"}`} />
            )}
          </motion.div>
        </div>

        {/* Subtitles / Response / State Labels */}
        <div className="text-center w-full max-w-sm px-4 space-y-4">
          <div className="text-[11px] tracking-[0.3em] text-[#6c6568] uppercase font-bold">
            {state === "idle" && "Standby Mode"}
            {state === "connecting" && "Initializing Connection"}
            {state === "connected" && (isSpeaking ? "Active Speaking" : "Listening Live")}
            {state === "error" && "Connection Error"}
          </div>

          <h2 className="text-base md:text-lg text-white/80 leading-relaxed font-sans font-light min-h-[50px] flex items-center justify-center px-2">
            {state === "idle" && "Tap the core to begin"}
            {state === "connecting" && "Connecting to Myra's live voice stream..."}
            {state === "connected" && (
              isSpeaking 
                ? "“Myra is talking to you lovingly...”" 
                : "“Listening... speak sweet words to Myra!”"
            )}
            {state === "error" && "“An error occurred. Tap to reconnect.”"}
          </h2>

          {/* Sequences of dots underneath, matches image */}
          <div className="flex justify-center items-center gap-2 py-2">
            {Array.from({ length: 11 }).map((_, i) => {
              const isActive = state === "connected" && (isSpeaking ? (i % 3 === 0) : true);
              return (
                <motion.div 
                  key={i}
                  animate={state === "connected" && isSpeaking ? {
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }}
                  className={`w-1.5 h-1.5 rounded-full ${
                    state === "connected"
                      ? "bg-[#df1a3c]"
                      : "bg-[#2d1b1e]"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Interactive Center Mic Controller Button (bottom of center screen) */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleConnection}
            className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all shadow-lg ${
              state === "connected"
                ? "border-[#df1a3c] bg-[#df1a3c]/10 text-[#df1a3c] shadow-[#df1a3c]/10"
                : state === "connecting"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-500 animate-pulse"
                : "border-[#2d1b1e] hover:border-[#6c6568]/40 bg-white/[0.02] text-[#968e92]"
            }`}
          >
            {state === "connected" ? (
              <Mic className="w-6 h-6 animate-pulse" />
            ) : (
              <MicOff className="w-6 h-6 opacity-60" />
            )}
          </motion.button>
          
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="text-[9px] uppercase tracking-widest text-[#6c6568] hover:text-[#f8f1ed] transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3 h-3" />
            {showPrompts ? "Hide Hints" : "Show Conversation Hints"}
          </button>
        </div>

        {/* Configuration drawer overlays */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full bg-[#120a0d] border border-[#2d1b1e] rounded-xl p-5 backdrop-blur-xl absolute bottom-0 left-0 right-0 m-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-[#df1a3c]" />
                  Voice Config
                </h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-[#6c6568] hover:text-[#f8f1ed]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2.5">
                {availableVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setVoiceName(voice.id);
                      if (state === "connected") {
                        disconnect();
                        setTimeout(() => connect(voice.id), 200);
                      }
                    }}
                    className={`p-3 text-left rounded-lg border text-xs transition-all flex justify-between items-center ${
                      voiceName === voice.id
                        ? "bg-[#df1a3c]/10 border-[#df1a3c] text-white"
                        : "bg-black/20 border-[#2d1b1e] text-[#968e92] hover:border-[#6c6568]/40"
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{voice.name}</span>
                      <p className="text-[10px] text-[#6c6568] mt-0.5">{voice.description}</p>
                    </div>
                    {voiceName === voice.id && <Heart className="w-3.5 h-3.5 fill-[#df1a3c] text-[#df1a3c] shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-white/[0.01] rounded-lg flex items-start gap-2 border border-[#2d1b1e]/50 text-[10px] text-[#6c6568] leading-relaxed">
                <Info className="w-3.5 h-3.5 text-[#df1a3c] shrink-0 mt-0.5" />
                <p>Changing voice accent re-initiates the connection. Use headphones for premium echo-free audio stream.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation Hints Drawer overlay */}
        <AnimatePresence>
          {showPrompts && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full bg-[#120a0d] border border-[#2d1b1e] rounded-xl p-5 backdrop-blur-xl absolute bottom-0 left-0 right-0 m-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#df1a3c]" />
                  Conversation Hints
                </h3>
                <button 
                  onClick={() => setShowPrompts(false)}
                  className="p-1 text-[#6c6568] hover:text-[#f8f1ed]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {promptIdeas.map((idea, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-black/20 border border-[#2d1b1e] hover:border-[#df1a3c]/30 transition-all text-left"
                  >
                    <span className="text-[8px] text-[#df1a3c] font-bold block uppercase tracking-wider mb-1">
                      {idea.title}
                    </span>
                    <p className="text-[11px] text-[#968e92] font-sans leading-snug">
                      "{idea.text}"
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-2.5 bg-white/[0.01] rounded-lg flex items-center gap-2 border border-[#2d1b1e]/50 text-[10px] text-[#6c6568] justify-center">
                <Smile className="w-3.5 h-3.5 text-[#df1a3c] shrink-0" />
                <span>Talk to Myra in Bengali! She will respond playfully.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notification Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-red-950/20 border border-red-500/30 rounded-lg p-3 flex gap-2.5 text-red-200 items-start mt-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <p className="font-semibold mb-0.5">Connection Error</p>
                <p className="opacity-80 leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer System Status details */}
      <footer className="w-full max-w-lg mx-auto px-6 py-6 border-t border-[#2d1b1e]/60 z-10 flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-[#6c6568] font-bold">
        <span>Target: Rajon Jarkita</span>
        <span>System Core v2.5</span>
      </footer>

    </div>
  );
}


