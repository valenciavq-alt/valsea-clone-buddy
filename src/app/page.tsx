"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Globe,
  Shield,
  Brain,
  Mic,
  Radio,
  AlertTriangle,
  Zap,
  Eye,
  FileText,
  ChevronDown,
  Play,
  Square,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmotionScores {
  frustration: number;
  stress: number;
  politeness: number;
  hesitation: number;
  urgency: number;
}

interface SecurityMetrics {
  syntheticProb: number;
  behavioralRisk: number;
  livenessStatus: "scanning" | "verified" | "failed";
}

interface IntentLayers {
  literal: string;
  cultural: string;
  trueIntent: string;
}

interface EnterprisePayload {
  type: string;
  data: Record<string, any>;
}

type Scenario = "logistics" | "cx_escalation" | "fraud_security";

interface ScenarioConfig {
  label: string;
  source: string;
  target: string;
  scenario: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  logistics: {
    label: "Cross-Border Logistics",
    source: "Singapore",
    target: "Logistics System",
    scenario: "Cross-Border Logistics",
  },
  cx_escalation: {
    label: "CX Escalation",
    source: "Malaysia",
    target: "CX Platform",
    scenario: "Customer Escalation",
  },
  fraud_security: {
    label: "Fraud / Security",
    source: "Unknown",
    target: "Security Hub",
    scenario: "Fraud Detection",
  },
};

// Demo transcript data per scenario
const DEMO_TRANSCRIPTS: Record<Scenario, string[]> = {
  logistics: [
    "Caller: Eh hello, I need to check my shipment lah. The container stuck at port already three days.",
    "Agent: I understand sir. Can I have your tracking number please?",
    "Caller: Walao, I already give you people the number yesterday! Why never update one?",
    "Agent: Let me pull that up for you. I see the container is currently at Tanjong Pagar terminal.",
    "Caller: Aiya, my customer buay tahan already. Can expedite or not?",
  ],
  cx_escalation: [
    "Customer: I very frustrated with this service leh. Nobody help me for two weeks already!",
    "Agent: I'm so sorry to hear that. Let me escalate this right away.",
    "Customer: Please lah, I just want my refund. Kan cheong spider here waiting.",
    "Agent: I understand the urgency. I'll process this as priority.",
  ],
  fraud_security: [
    "Caller: Hello, this is the bank security department. Your account has been compromised.",
    "Caller: You need to transfer your funds immediately to this safe account.",
    "Caller: I need your OTP number now. The police are involved.",
    "Target: Uh... okay, let me check—",
    "Caller: Do it NOW. Your money will be frozen if you don't act immediately.",
  ],
};

const DEMO_EMOTIONS: Record<Scenario, EmotionScores> = {
  logistics: { frustration: 0.72, stress: 0.55, politeness: 0.45, hesitation: 0.2, urgency: 0.68 },
  cx_escalation: { frustration: 0.85, stress: 0.7, politeness: 0.3, hesitation: 0.15, urgency: 0.8 },
  fraud_security: { frustration: 0.1, stress: 0.9, politeness: 0.15, hesitation: 0.05, urgency: 0.95 },
};

const DEMO_SECURITY: Record<Scenario, SecurityMetrics> = {
  logistics: { syntheticProb: 0.03, behavioralRisk: 0.08, livenessStatus: "verified" },
  cx_escalation: { syntheticProb: 0.05, behavioralRisk: 0.12, livenessStatus: "verified" },
  fraud_security: { syntheticProb: 0.78, behavioralRisk: 0.92, livenessStatus: "failed" },
};

const DEMO_INTENT: Record<Scenario, IntentLayers> = {
  logistics: {
    literal: "Customer inquiring about delayed shipment at port, requesting expedition of container release.",
    cultural: "Singlish markers ('walao', 'buay tahan', 'lah') indicate genuine frustration, not hostility. 'Kan cheong' implies time pressure from downstream client.",
    trueIntent: "Expedite container release from Tanjong Pagar terminal. Customer's downstream client is pressuring for delivery — risk of churn if unresolved within 24h.",
  },
  cx_escalation: {
    literal: "Customer requesting refund after two weeks of unresolved support tickets.",
    cultural: "'Kan cheong spider' is Singlish for extreme anxiety/impatience. 'Leh' softens complaint but frustration is high.",
    trueIntent: "Immediate refund processing required. Customer loyalty at critical risk — potential social media escalation if not resolved this session.",
  },
  fraud_security: {
    literal: "Caller claiming to be bank security, demanding immediate fund transfer and OTP.",
    cultural: "No cultural markers — scripted social engineering attack using authority impersonation and urgency tactics.",
    trueIntent: "SOCIAL ENGINEERING ATTACK. Caller is impersonating bank authority to extract OTP and initiate unauthorized fund transfer. Immediate call termination and security alert required.",
  },
};

const DEMO_PAYLOADS: Record<Scenario, EnterprisePayload> = {
  logistics: {
    type: "maersk_shipping_api",
    data: {
      shipment_id: "MAEU-2847391",
      container: "TCLU-7293841",
      origin_port: "SGSIN",
      destination: "HKHKG",
      status: "HELD_AT_PORT",
      priority: "EXPEDITE",
      sla_impact: "HIGH",
      churn_risk: 0.73,
      action: "RELEASE_CONTAINER",
    },
  },
  cx_escalation: {
    type: "zendesk_escalation",
    data: {
      ticket_id: "ZD-48291",
      customer_id: "CUS-88412",
      priority: "URGENT",
      sentiment: "CRITICAL_NEGATIVE",
      resolution: "REFUND_PROCESS",
      escalation_level: 3,
      churn_probability: 0.89,
      action: "IMMEDIATE_REFUND",
    },
  },
  fraud_security: {
    type: "mas_regulatory_alert",
    data: {
      alert_id: "MAS-SEC-20260307",
      threat_type: "SOCIAL_ENGINEERING",
      severity: "CRITICAL",
      synthetic_voice_prob: 0.78,
      behavioral_fraud_score: 0.92,
      action: "TERMINATE_AND_ALERT",
      regulatory_body: "MAS",
      report_to: "DBS_FRAUD_UNIT",
    },
  },
};

// ─── Prosody Bar ─────────────────────────────────────────────────────────────

function ProsodyBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs font-medium text-[var(--muted-light)] tracking-wide">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="w-10 text-right text-xs font-mono text-[var(--muted)]">{pct}%</span>
    </div>
  );
}

// ─── Waveform Visualizer ─────────────────────────────────────────────────────

function WaveformVisualizer({ isActive }: { isActive: boolean }) {
  const bars = 40;
  return (
    <div className="flex items-end justify-center gap-[2px] h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-[var(--accent)]"
          style={{ opacity: isActive ? 0.6 : 0.15 }}
          animate={
            isActive
              ? {
                  height: [8, Math.random() * 48 + 8, 8],
                }
              : { height: 8 }
          }
          transition={
            isActive
              ? {
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.02,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ─── Panel Header ────────────────────────────────────────────────────────────

function PanelHeader({
  icon: Icon,
  title,
  badge,
  badgeColor,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--accent-light)]" />
        <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--foreground)]">
          {title}
        </span>
      </div>
      {badge && (
        <span
          className="text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full border"
          style={{
            color: badgeColor || "var(--cyan)",
            borderColor: badgeColor ? `${badgeColor}33` : "rgba(6,182,212,0.2)",
            background: badgeColor ? `${badgeColor}10` : "rgba(6,182,212,0.06)",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeScenario, setActiveScenario] = useState<Scenario>("logistics");
  const [isRunning, setIsRunning] = useState(false);
  const [demoPhase, setDemoPhase] = useState<"idle" | "streaming" | "complete">("idle");
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [emotions, setEmotions] = useState<EmotionScores>({ frustration: 0, stress: 0, politeness: 0, hesitation: 0, urgency: 0 });
  const [security, setSecurity] = useState<SecurityMetrics>({ syntheticProb: 0, behavioralRisk: 0, livenessStatus: "scanning" });
  const [intent, setIntent] = useState<IntentLayers>({ literal: "", cultural: "", trueIntent: "" });
  const [payload, setPayload] = useState<EnterprisePayload | null>(null);
  const [streamStats] = useState({ streams: 1402, p50: 124, regions: 12, alerts: 0 });

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const config = SCENARIOS[activeScenario];
  const transcript = DEMO_TRANSCRIPTS[activeScenario];

  const runDemo = useCallback(() => {
    setIsRunning(true);
    setDemoPhase("streaming");
    setVisibleLines(0);
    setEmotions({ frustration: 0, stress: 0, politeness: 0, hesitation: 0, urgency: 0 });
    setSecurity({ syntheticProb: 0, behavioralRisk: 0, livenessStatus: "scanning" });
    setIntent({ literal: "", cultural: "", trueIntent: "" });
    setPayload(null);

    const lines = transcript;
    let lineIdx = 0;

    const lineInterval = setInterval(() => {
      lineIdx++;
      setVisibleLines(lineIdx);

      // Gradually increase emotion scores
      const progress = lineIdx / lines.length;
      const target = DEMO_EMOTIONS[activeScenario];
      setEmotions({
        frustration: target.frustration * progress,
        stress: target.stress * progress,
        politeness: target.politeness * Math.min(progress * 1.5, 1),
        hesitation: target.hesitation * progress,
        urgency: target.urgency * progress,
      });

      if (lineIdx >= lines.length) {
        clearInterval(lineInterval);

        // Final results after transcript complete
        setTimeout(() => {
          setEmotions(DEMO_EMOTIONS[activeScenario]);
          setSecurity(DEMO_SECURITY[activeScenario]);
          setIntent(DEMO_INTENT[activeScenario]);
          setPayload(DEMO_PAYLOADS[activeScenario]);
          setDemoPhase("complete");
          setIsRunning(false);
        }, 800);
      }
    }, 1200);

    return () => clearInterval(lineInterval);
  }, [activeScenario, transcript]);

  const resetDemo = () => {
    setIsRunning(false);
    setDemoPhase("idle");
    setVisibleLines(0);
    setEmotions({ frustration: 0, stress: 0, politeness: 0, hesitation: 0, urgency: 0 });
    setSecurity({ syntheticProb: 0, behavioralRisk: 0, livenessStatus: "scanning" });
    setIntent({ literal: "", cultural: "", trueIntent: "" });
    setPayload(null);
  };

  // Reset when scenario changes
  useEffect(() => {
    resetDemo();
  }, [activeScenario]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo & Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white">VALSEA</span>
                <span className="text-[10px] block -mt-0.5 tracking-[0.2em] uppercase text-[var(--muted)]">Speech Intelligence</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-5 text-xs text-[var(--muted)] font-mono">
              <span><Zap className="w-3 h-3 inline mr-1 text-[var(--success)]" />{streamStats.streams.toLocaleString()} <span className="text-[var(--muted-light)]">streams</span></span>
              <span>⏱ {streamStats.p50}ms <span className="text-[var(--muted-light)]">P50</span></span>
              <span>🌐 {streamStats.regions} <span className="text-[var(--muted-light)]">regions</span></span>
              <span>⚠ {streamStats.alerts} <span className="text-[var(--muted-light)]">alerts</span></span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] pulse-dot" />
                <span className="text-[var(--success)]">All Systems</span>
              </span>
            </div>
          </div>

          {/* Scenario Tabs + Run */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/[0.04] rounded-lg p-0.5">
              {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveScenario(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeScenario === key
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--muted-light)] hover:text-white"
                  }`}
                >
                  {SCENARIOS[key].label}
                </button>
              ))}
            </div>

            <button
              onClick={isRunning ? resetDemo : runDemo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{
                background: isRunning ? "var(--danger)" : "var(--brand-gradient)",
              }}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3" /> STOP
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> RUN DEMO
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Dashboard Grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Row 1: Event Context | Prosody | Security */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Event Context */}
          <div className="col-span-12 md:col-span-3 panel p-5">
            <PanelHeader icon={Globe} title="Event Context" badge="LIVE" badgeColor="#22c55e" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Source
                </span>
                <p className="font-semibold mt-1">{config.source}</p>
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Target
                </span>
                <p className="font-semibold mt-1">{config.target}</p>
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Scenario
                </span>
                <p className="font-semibold mt-1">{config.scenario}</p>
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  ⏱ Time
                </span>
                <p className="font-semibold mt-1">Now</p>
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Confidence
                </span>
                <p className="font-semibold mt-1 font-mono">
                  {demoPhase === "complete" ? "94%" : "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Severity
                </span>
                <p className="font-semibold mt-1">
                  {demoPhase === "complete" ? (
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        color: activeScenario === "fraud_security" ? "var(--danger)" : activeScenario === "cx_escalation" ? "var(--warning)" : "var(--success)",
                        background: activeScenario === "fraud_security" ? "rgba(239,68,68,0.1)" : activeScenario === "cx_escalation" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                      }}
                    >
                      {activeScenario === "fraud_security" ? "CRITICAL" : activeScenario === "cx_escalation" ? "HIGH" : "MEDIUM"}
                    </span>
                  ) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Prosody Analysis */}
          <div className="col-span-12 md:col-span-5 panel p-5">
            <PanelHeader icon={Activity} title="Prosody Analysis" badge="HUME AI" badgeColor="#f59e0b" />
            <div className="space-y-3">
              <ProsodyBar label="Frustration" value={emotions.frustration} color="var(--danger)" />
              <ProsodyBar label="Stress" value={emotions.stress} color="var(--warning)" />
              <ProsodyBar label="Politeness" value={emotions.politeness} color="var(--success)" />
              <ProsodyBar label="Hesitation" value={emotions.hesitation} color="var(--purple)" />
              <ProsodyBar label="Urgency" value={emotions.urgency} color="var(--cyan)" />
            </div>
          </div>

          {/* Security Layer */}
          <div className="col-span-12 md:col-span-4 panel p-5">
            <PanelHeader icon={Shield} title="Security Layer" badge="MODULATE" badgeColor="#a855f7" />
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-xs font-mono tracking-wider text-[var(--muted-light)]">SYNTHETIC PROB.</span>
                <span className="text-sm font-mono font-semibold">
                  {demoPhase === "complete"
                    ? `${Math.round(security.syntheticProb * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-xs font-mono tracking-wider text-[var(--muted-light)]">BEHAVIORAL RISK</span>
                <span className="text-sm font-mono font-semibold">
                  {demoPhase === "complete"
                    ? `${Math.round(security.behavioralRisk * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-mono tracking-wider text-[var(--muted-light)]">LIVENESS</span>
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                  <span
                    className="w-2 h-2 rounded-full pulse-dot"
                    style={{
                      background:
                        security.livenessStatus === "verified"
                          ? "var(--success)"
                          : security.livenessStatus === "failed"
                          ? "var(--danger)"
                          : "var(--warning)",
                    }}
                  />
                  {security.livenessStatus === "scanning" ? "SCANNING" : security.livenessStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Acoustic | Transcription | Intent */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Acoustic Layer */}
          <div className="col-span-12 md:col-span-3 panel p-5">
            <PanelHeader icon={Mic} title="Acoustic Layer" badge={demoPhase === "streaming" ? "ACTIVE" : "IDLE"} badgeColor={demoPhase === "streaming" ? "#22c55e" : undefined} />
            <div className="mt-4">
              <WaveformVisualizer isActive={demoPhase === "streaming"} />
            </div>
            <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/[0.04]">
              <span className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1">
                <Radio className="w-3 h-3" /> VAPI WEBRTC
              </span>
              <span className="text-[10px] font-mono text-[var(--muted)]">
                {demoPhase === "streaming" ? "128ms" : "0ms"} LATENCY
              </span>
            </div>
          </div>

          {/* Transcription */}
          <div className="col-span-12 md:col-span-5 panel p-5">
            <PanelHeader icon={FileText} title="Transcription" badge="CHIRP USM" badgeColor="#06b6d4" />
            <div className="min-h-[200px] max-h-[260px] overflow-y-auto pr-2">
              {demoPhase === "idle" ? (
                <p className="text-sm text-[var(--muted)] italic mt-12 text-center">
                  Awaiting audio stream...
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {transcript.slice(0, visibleLines).map((line, i) => {
                      const isCaller = line.toLowerCase().startsWith("caller") || line.toLowerCase().startsWith("customer") || line.toLowerCase().startsWith("target");
                      const text = line.replace(/^(Caller|Agent|Customer|Target):\s*/i, "");
                      // Highlight Singlish words
                      const singlishWords = ["lah", "leh", "lor", "walao", "wah", "aiya", "buay tahan", "kan cheong", "sotong", "buay"];
                      let highlighted = text;
                      singlishWords.forEach((w) => {
                        const regex = new RegExp(`\\b${w}\\b`, "gi");
                        highlighted = highlighted.replace(regex, `<mark class="bg-[var(--accent-glow)] text-[var(--accent-light)] px-1 rounded font-medium">${w}</mark>`);
                      });

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`text-sm leading-relaxed p-2 rounded-lg ${
                            isCaller ? "bg-white/[0.03]" : "bg-[var(--accent-glow)] ml-4"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-[var(--muted)] block mb-0.5">
                            {isCaller ? "CALLER" : "AGENT"}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {demoPhase === "streaming" && (
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Transcribing...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Intent Engine */}
          <div className="col-span-12 md:col-span-4 panel p-5">
            <PanelHeader icon={Brain} title="Intent Engine" badge="GEMINI 2.5 PRO" badgeColor="#818cf8" />
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] font-mono tracking-wider text-[var(--muted)] block mb-1.5">LITERAL TRANSLATION</span>
                <p className="text-xs leading-relaxed text-[var(--muted-light)]">
                  {intent.literal || <span className="italic text-[var(--muted)]">—</span>}
                </p>
              </div>
              <div className="flex justify-center">
                <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] font-mono tracking-wider text-[var(--muted)] block mb-1.5">CULTURAL / PROSODY OVERRIDE</span>
                <p className="text-xs leading-relaxed text-[var(--muted-light)]">
                  {intent.cultural || <span className="italic text-[var(--muted)]">—</span>}
                </p>
              </div>
              <div className="flex justify-center">
                <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div className="p-3 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)]/20">
                <span className="text-[10px] font-mono tracking-wider text-[var(--danger)] font-bold block mb-1.5">TRUE INTENT</span>
                <p className="text-xs leading-relaxed font-medium">
                  {intent.trueIntent || <span className="italic text-[var(--muted)]">—</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Enterprise Action */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent-light)]" />
              <span className="text-xs font-semibold tracking-[0.15em] uppercase">Enterprise Action</span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-[var(--muted)] px-2 py-0.5 rounded-full border border-white/[0.06]">
              JSON PAYLOAD
            </span>
          </div>

          {payload ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <pre className="text-xs font-mono leading-relaxed text-[var(--muted-light)] bg-black/20 rounded-lg p-4 overflow-x-auto">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </motion.div>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--muted)] italic">
              Awaiting analysis completion to generate enterprise payload...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
