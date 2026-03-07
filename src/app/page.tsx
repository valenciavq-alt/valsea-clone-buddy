import VapiCallButton from "@/components/vapi/VapiCallButton";
import { ShieldAlert, Activity, BrainCircuit, Mic, Waves } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
            <Waves className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
              Project <span className="text-emerald-400">VALSEA</span>
            </h1>
            <p className="text-xs text-slate-400">Sentinel Voice Agent Demo</p>
          </div>
        </div>
        <div>
          <VapiCallButton />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          {/* Left Side: Acoustic Ingestion */}
          <div className="flex flex-col space-y-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex-1 flex flex-col relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Mic className="w-5 h-5 text-emerald-400" />
                  Live Acoustic Ingestion
                </h2>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-emerald-400 font-mono tracking-widest font-bold">LISTENING</span>
                </div>
              </div>

              {/* Waveform graphic placeholder */}
              <div className="h-24 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-6 flex items-center justify-center overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay" />
                <div className="flex items-end space-x-[3px] h-12 w-full px-8 justify-center">
                  {[...Array(40)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-emerald-500/80 rounded-t-sm"
                      style={{
                        height: `${Math.max(15, Math.random() * 100)}%`,
                        animation: `pulse ${0.5 + Math.random() * 1.5}s ease-in-out infinite alternate`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live Transcript (Chirp) */}
              <div className="flex-1 bg-slate-950/60 rounded-xl border border-slate-800/60 p-5 font-mono text-sm text-slate-300 overflow-y-auto custom-scrollbar shadow-inner relative">
                <div className="absolute top-0 right-0 p-2">
                  <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded uppercase tracking-widest">Google Chirp USM</span>
                </div>
                <p className="text-slate-500 italic mb-3">// Raw Transcription Feed</p>
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg border-l-2 border-l-emerald-500">
                    <p><span className="text-emerald-400 font-bold mb-1 block">Caller (Customer):</span>
                      &quot;Walao eh, the driver is blur like sotong! He say he arrived but where got?&quot;</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg border-l-2 border-l-blue-400">
                    <p><span className="text-blue-400 font-bold mb-1 block">Agent (VALSEA):</span>
                      &quot;I see that the driver has arrived. I&apos;m investigating this right now. Please hold for just a moment.&quot;</p>
                  </div>
                  <p className="animate-pulse text-emerald-500 font-bold">_</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Cognitive Hub */}
          <div className="flex flex-col space-y-4">

            {/* Hume & Modulate Modules */}
            <div className="grid grid-cols-2 gap-4">
              {/* Emotion Engine (Hume) */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm relative shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-50" />
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-200">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Prosody (Hume AI)
                </h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                      <span className="text-slate-400 uppercase tracking-wider">Frustration</span>
                      <span className="text-indigo-400 font-bold">0.89</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
                      <div className="h-full bg-indigo-500 w-[89%] shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                      <span className="text-slate-400 uppercase tracking-wider">Anxiety</span>
                      <span className="text-amber-400 font-bold">0.65</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-amber-500 w-[65%] shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Engine (Modulate) */}
              <div className="bg-slate-900/40 border-l border-b border-t border-slate-800 border-r-4 border-r-rose-500/80 rounded-2xl p-5 backdrop-blur-sm shadow-[inset_-15px_0_30px_rgba(244,63,94,0.08)] relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 blur-xl rounded-full mix-blend-screen" />
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-200 z-10 relative">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Security (Modulate)
                </h3>
                <div className="flex items-center justify-between mb-2 z-10 relative">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Deepfake Prob</span>
                  <span className="text-rose-400 font-mono text-base font-bold drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">0.98 !!</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4 shadow-inner z-10 relative">
                  <div className="h-full bg-rose-500 w-[98%] shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse" />
                </div>
                <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] px-2.5 py-1.5 rounded-md uppercase tracking-widest font-bold flex items-center justify-center z-10 relative shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <span className="animate-pulse">Behavioral Threat Flagged</span>
                </div>
              </div>
            </div>

            {/* Gemini Cognitive Sandbox */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex-1 flex flex-col relative shadow-xl overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50 transition-all duration-1000 group-hover:opacity-100" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />

              <div className="flex justify-between items-center mb-4 z-10 relative">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                  <BrainCircuit className="w-5 h-5 text-blue-400" />
                  Cognitive Synthesis
                </h3>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded uppercase font-mono tracking-widest">
                  Gemini Flash 3
                </span>
              </div>

              <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 font-mono text-[13px] overflow-y-auto shadow-inner relative z-10 group-hover:border-blue-500/30 transition-colors">
                <p className="text-slate-500 italic mb-4">// Intent Realignment output via Gemini reasoning engine</p>
                <div className="text-sky-300 leading-relaxed font-medium">
                  <span className="text-slate-400">&#123;</span><br />
                  <div className="pl-4 border-l border-slate-800 group-hover:border-blue-500/30 transition-colors py-1">
                    <span className="text-blue-300">&quot;status&quot;:</span> <span className="text-emerald-400">&quot;OK&quot;</span>,<br />
                    <span className="text-blue-300">&quot;intent&quot;:</span> <span className="text-amber-300">&quot;High Priority Complaint - Unfulfilled Logistics&quot;</span>,<br />
                    <span className="text-blue-300">&quot;translation&quot;:</span> <span className="text-slate-200">&quot;The customer is extremely frustrated. The assigned driver has not arrived despite falsely claiming arrival.&quot;</span>,<br />
                    <span className="text-blue-300">&quot;cultural_context&quot;:</span> <span className="text-slate-200">&quot;Uses colloquialism &apos;blur like sotong&apos; (Singlish) indicating the driver is perceived as highly incompetent or severely confused.&quot;</span>,<br />
                    <span className="text-blue-300">&quot;fraud_verdict&quot;:</span> <span className="text-rose-400">&quot;HIGH RISK IMPERSONATION. Social Engineering markers present.&quot;</span>,<br />
                    <span className="text-blue-300">&quot;action_advised&quot;:</span> <span className="text-slate-200">&quot;Bypass chatbot queue. Trigger Dynamic Honeypot Protocol. Alert PI team.&quot;</span>
                  </div>
                  <span className="text-slate-400">&#125;</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
