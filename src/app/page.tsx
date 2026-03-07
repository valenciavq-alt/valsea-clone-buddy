"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Brain,
  MessageSquareText,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Globe,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisResult {
  transcript: { role: "user" | "assistant"; text: string }[];
  emotions: {
    frustration: number;
    anxiety: number;
    politeness: number;
    confidence: number;
  };
  security: {
    deepfakeProb: number;
    threatFlag: boolean;
    riskLevel: "low" | "medium" | "high";
  };
  cognitive: {
    status: string;
    intent: string;
    translation: string;
    cultural_context: string;
    fraud_verdict: string;
    action_advised: string;
  };
  summary: string;
}

type Phase = "upload" | "analyzing" | "dashboard";

// ─── Gauge Component ─────────────────────────────────────────────────────────

function GaugeCircle({
  value,
  max = 1,
  size = 100,
  color,
  label,
  displayValue,
}: {
  value: number;
  max?: number;
  size?: number;
  color: string;
  label: string;
  displayValue?: string;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="gauge-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="gauge-fill"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-[var(--foreground)]">
            {displayValue ?? `${Math.round(progress * 100)}%`}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-[var(--muted)] tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [dialogText, setDialogText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);

    if (file.type.startsWith("audio/") || file.name.match(/\.(wav|mp3|m4a|aiff|flac)$/i)) {
      setAudioFile(file);
      setDialogText("Audio file uploaded: " + file.name + "\nReady to analyze via VALSEA.");
      return;
    }

    setAudioFile(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setDialogText(text);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Analysis (real Gemini API call) ──────────────────────────────────────

  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!dialogText.trim() && !audioFile) return;
    setPhase("analyzing");
    setError(null);

    try {
      // Parse dialog into transcript lines for the UI if it is text
      let lines: { role: "user" | "assistant"; text: string }[] = [];
      if (!audioFile) {
        lines = dialogText
          .split("\n")
          .filter((l) => l.trim())
          .map((line) => {
            const isUser =
              line.toLowerCase().startsWith("customer") ||
              line.toLowerCase().startsWith("caller") ||
              line.toLowerCase().startsWith("user");
            return {
              role: (isUser ? "user" : "assistant") as "user" | "assistant",
              text: line.replace(/^(customer|caller|user|agent|assistant|operator)\s*[:：]\s*/i, ""),
            };
          });
      }

      // Call the real Gemini-powered analysis API via VALSEA
      let res;
      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);
        res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dialog: dialogText }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${res.status})`);
      }

      const apiResult = await res.json();

      let transcriptToUse = lines;
      if (audioFile && apiResult.transcript) {
        transcriptToUse = apiResult.transcript;
      } else if (lines.length === 0) {
        transcriptToUse = [{ role: "user", text: dialogText }];
      }

      // Merge transcript from client-side parsing with API analysis
      const result: AnalysisResult = {
        transcript: transcriptToUse,
        emotions: apiResult.emotions,
        security: apiResult.security,
        cognitive: apiResult.cognitive,
        summary: apiResult.summary,
      };

      setAnalysis(result);
      setPhase("dashboard");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("upload");
    }
  }, [dialogText]);

  const reset = () => {
    setPhase("upload");
    setDialogText("");
    setAnalysis(null);
    setFileName(null);
    setAudioFile(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans relative overflow-hidden">
      {/* Subtle background gradient orbs — Apple style */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-green-200/15 rounded-full blur-[100px]" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--background)]/70 border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              VALSEA
            </span>
            <span className="text-xs text-[var(--muted)] font-medium ml-1 hidden sm:inline">
              Voice Analysis Engine
            </span>
          </div>

          {phase === "dashboard" && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={reset}
              className="apple-btn-secondary apple-btn text-sm !py-2 !px-4"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Analysis
            </motion.button>
          )}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════════
              PHASE 1: Upload
          ════════════════════════════════════════════════════════════ */}
          {phase === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0, 1] }}
              className="max-w-2xl mx-auto pt-12"
            >
              {/* Hero text */}
              <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mb-4">
                  Analyze any
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    conversation.
                  </span>
                </h1>
                <p className="text-base text-[var(--muted)] max-w-md mx-auto leading-relaxed">
                  Upload a dialog to decode intent, emotion, cultural context,
                  and security threats — all in seconds.
                </p>
              </div>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`dropzone p-8 text-center cursor-pointer transition-all ${isDragging ? "active" : ""
                  }`}
                onClick={() => textareaRef.current?.focus()}
              >
                {dialogText ? (
                  <div className="text-left">
                    {fileName && (
                      <div className="flex items-center gap-2 mb-4 text-sm text-[var(--muted)]">
                        <FileText className="w-4 h-4" />
                        <span>{fileName}</span>
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={dialogText}
                      onChange={(e) => setDialogText(e.target.value)}
                      className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-[var(--foreground)] min-h-[200px] font-mono"
                      placeholder="Paste or type a conversation..."
                    />
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <p className="text-base font-medium text-[var(--foreground)] mb-1">
                      Drop a dialog file or click to type
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Supports .txt files or paste text directly
                    </p>

                    <textarea
                      ref={textareaRef}
                      value={dialogText}
                      onChange={(e) => setDialogText(e.target.value)}
                      className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-[var(--foreground)] mt-6 min-h-[120px] font-mono text-center placeholder:text-center"
                      placeholder="Or paste your conversation here..."
                    />
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                id="fileInput"
                accept=".txt,.csv,.json,.log,audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />


              {/* Error display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <label
                  htmlFor="fileInput"
                  className="apple-btn apple-btn-secondary text-sm cursor-pointer !py-2.5 !px-5"
                >
                  <FileText className="w-4 h-4" />
                  Browse Files
                </label>
                <button
                  onClick={runAnalysis}
                  disabled={!dialogText.trim() && !audioFile}
                  className="apple-btn text-sm !py-2.5 !px-6"
                >
                  Analyze
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PHASE 2: Analyzing
          ════════════════════════════════════════════════════════════ */}
          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0, 1] }}
              className="flex flex-col items-center justify-center pt-32"
            >
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--accent)] spin-slow" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 spin-slow" style={{ animationDuration: '3s' }} />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">
                Analyzing conversation
              </h2>
              <p className="text-[var(--muted)] text-sm max-w-xs text-center leading-relaxed">
                Decoding intent, emotion, cultural nuance, and security signals...
              </p>
              <div className="flex gap-6 mt-8">
                {["Transcription", "Prosody", "Security", "Cognition"].map(
                  (step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.6, duration: 0.4 }}
                      className="flex items-center gap-1.5 text-xs text-[var(--muted)]"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.6 + 0.3 }}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                      />
                      {step}
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PHASE 3: Dashboard
          ════════════════════════════════════════════════════════════ */}
          {phase === "dashboard" && analysis && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Summary banner */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5 mb-6 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">
                    Analysis Complete
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              </motion.div>

              {/* Dashboard grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-children">
                {/* ── Transcript Card ─────────────────────────── */}
                <div className="lg:col-span-2 glass-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <MessageSquareText className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-sm font-semibold">Transcript</h3>
                  </div>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                    {analysis.transcript.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className={`flex gap-3 ${msg.role === "user" ? "" : "flex-row-reverse"}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${msg.role === "user"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                            }`}
                        >
                          {msg.role === "user" ? "C" : "A"}
                        </div>
                        <div
                          className={`py-2.5 px-4 rounded-2xl text-sm leading-relaxed max-w-[80%] ${msg.role === "user"
                            ? "bg-gray-100 text-[var(--foreground)]"
                            : "bg-blue-50 text-[var(--foreground)]"
                            }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* ── Emotion Gauges ──────────────────────────── */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold">Prosody Analysis</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <GaugeCircle
                      value={analysis.emotions.frustration}
                      color="#ff3b30"
                      label="Frustration"
                      size={90}
                    />
                    <GaugeCircle
                      value={analysis.emotions.anxiety}
                      color="#ff9f0a"
                      label="Anxiety"
                      size={90}
                    />
                    <GaugeCircle
                      value={analysis.emotions.politeness}
                      color="#34c759"
                      label="Politeness"
                      size={90}
                    />
                    <GaugeCircle
                      value={analysis.emotions.confidence}
                      color="#0071e3"
                      label="Confidence"
                      size={90}
                    />
                  </div>
                </div>

                {/* ── Security Card ───────────────────────────── */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    {analysis.security.threatFlag ? (
                      <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
                    )}
                    <h3 className="text-sm font-semibold">Security</h3>
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <GaugeCircle
                      value={analysis.security.deepfakeProb}
                      color={
                        analysis.security.deepfakeProb > 0.7
                          ? "#ff3b30"
                          : analysis.security.deepfakeProb > 0.4
                            ? "#ff9f0a"
                            : "#34c759"
                      }
                      label="Deepfake"
                      size={80}
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-xs text-[var(--muted)] block mb-1">
                          Risk Level
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${analysis.security.riskLevel === "high"
                            ? "bg-red-50 text-red-600"
                            : analysis.security.riskLevel === "medium"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-green-50 text-green-600"
                            }`}
                        >
                          {analysis.security.riskLevel === "high" && (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {analysis.security.riskLevel.charAt(0).toUpperCase() +
                            analysis.security.riskLevel.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--muted)] block mb-1">
                          Threat
                        </span>
                        <span
                          className={`text-sm font-medium ${analysis.security.threatFlag
                            ? "text-[var(--danger)]"
                            : "text-[var(--success)]"
                            }`}
                        >
                          {analysis.security.threatFlag
                            ? "Flagged"
                            : "Clear"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Cognitive Analysis Card ─────────────────── */}
                <div className="lg:col-span-2 glass-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Brain className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-sm font-semibold">
                      Cognitive Synthesis
                    </h3>
                    <span className="text-[10px] bg-blue-50 text-[var(--accent)] px-2 py-0.5 rounded-full font-medium ml-auto">
                      Gemini Flash
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        label: "Intent",
                        value: analysis.cognitive.intent,
                        icon: <Sparkles className="w-3.5 h-3.5" />,
                      },
                      {
                        label: "Translation",
                        value: analysis.cognitive.translation,
                        icon: <Globe className="w-3.5 h-3.5" />,
                      },
                      {
                        label: "Cultural Context",
                        value: analysis.cognitive.cultural_context,
                        icon: <MessageSquareText className="w-3.5 h-3.5" />,
                      },
                      {
                        label: "Action Advised",
                        value: analysis.cognitive.action_advised,
                        icon: <ArrowRight className="w-3.5 h-3.5" />,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-gray-50/80 rounded-xl p-4 border border-black/[0.03]"
                      >
                        <div className="flex items-center gap-1.5 mb-2 text-[var(--muted)]">
                          {item.icon}
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--foreground)]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Fraud verdict */}
                  <div
                    className={`mt-4 p-4 rounded-xl border text-sm flex items-start gap-3 ${analysis.cognitive.fraud_verdict.includes("HIGH")
                      ? "bg-red-50/80 border-red-200/60 text-red-700"
                      : "bg-green-50/80 border-green-200/60 text-green-700"
                      }`}
                  >
                    {analysis.cognitive.fraud_verdict.includes("HIGH") ? (
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-xs uppercase tracking-wide block mb-0.5">
                        Fraud Verdict
                      </span>
                      {analysis.cognitive.fraud_verdict}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
