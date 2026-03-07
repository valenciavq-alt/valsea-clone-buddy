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
  PhoneCall,
  PhoneOff,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useToast } from "@/components/Toast";

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) return "Rate limit exceeded — please wait a moment and try again.";
  if (msg.includes("402") || msg.toLowerCase().includes("credit") || msg.toLowerCase().includes("quota")) return "API credits exhausted — check your plan usage.";
  if (msg.includes("401") || msg.includes("403")) return "Authentication failed — check your API key configuration.";
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return "Server error — the analysis service is temporarily unavailable.";
  if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("failed to fetch")) return "Network error — check your internet connection.";
  return msg || "Analysis failed — please try again.";
}

// ─── Analyze via Lovable Cloud edge function ────────────────────────────────
async function analyzeDialog(text: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ dialog: text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Analysis API error: ${res.status}`);
  }
  return res.json();
}

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

type Scenario = "logistics" | "fintech" | "cx_escalation" | "healthcare" | "legal" | "commerce" | "conversational_ai" | "enterprise_ops" | "fraud_security";

interface ScenarioConfig {
  label: string;
  source: string;
  target: string;
  scenario: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  logistics: {
    label: "Supply Chain",
    source: "Singapore",
    target: "Logistics System",
    scenario: "Cross-Border Logistics",
  },
  fintech: {
    label: "Fintech",
    source: "Hong Kong",
    target: "Compliance Engine",
    scenario: "Voice-Authenticated Transaction",
  },
  cx_escalation: {
    label: "Contact Centre",
    source: "Malaysia",
    target: "CX Platform",
    scenario: "Customer Escalation",
  },
  healthcare: {
    label: "Healthcare",
    source: "Philippines",
    target: "Clinical System",
    scenario: "Multilingual Triage",
  },
  legal: {
    label: "Legal",
    source: "Indonesia",
    target: "Compliance Hub",
    scenario: "Regulatory Evidence",
  },
  commerce: {
    label: "Commerce",
    source: "Thailand",
    target: "Marketplace",
    scenario: "Voice Product Discovery",
  },
  conversational_ai: {
    label: "Conv. AI",
    source: "Multi-region",
    target: "LLM Pipeline",
    scenario: "Speech Structuring Layer",
  },
  enterprise_ops: {
    label: "Enterprise",
    source: "Regional HQ",
    target: "Workflow Engine",
    scenario: "Meeting Intelligence",
  },
  fraud_security: {
    label: "Security",
    source: "Unknown",
    target: "Security Hub",
    scenario: "Fraud Detection",
  },
};

const DEMO_TRANSCRIPTS: Record<Scenario, string[]> = {
  logistics: [
    "Caller: Eh hello, I need to check my shipment lah. The container stuck at port already three days.",
    "Agent: I understand sir. Can I have your tracking number please?",
    "Caller: Walao, I already give you people the number yesterday! Why never update one?",
    "Agent: Let me pull that up for you. I see the container is currently at Tanjong Pagar terminal.",
    "Caller: Aiya, my customer buay tahan already. Can expedite or not?",
  ],
  fintech: [
    "Caller: Hello, I want to verify my wire transfer to Shanghai. The compliance team hold it since morning ah.",
    "Agent: Sure, let me check the transaction status for you.",
    "Caller: Wah, this one very urgent leh. My counterparty waiting. If cannot clear today, deal collapse already.",
    "Agent: I see the hold is due to a KYC flag. Let me escalate to compliance.",
    "Caller: Please lah, I do this transfer every month. Same beneficiary. Why suddenly got problem?",
  ],
  cx_escalation: [
    "Customer: I very frustrated with this service leh. Nobody help me for two weeks already!",
    "Agent: I'm so sorry to hear that. Let me escalate this right away.",
    "Customer: Please lah, I just want my refund. Kan cheong spider here waiting.",
    "Agent: I understand the urgency. I'll process this as priority.",
  ],
  healthcare: [
    "Caller: Doc, my lola, she having chest pain since last night. Very worry ah.",
    "Agent: I understand. Can you describe the pain location and severity?",
    "Caller: She say here, the left side. Parang tinutusok daw. She cannot breathe properly also.",
    "Agent: Is she conscious and responsive right now?",
    "Caller: Yes, but she very pale. We give her aspirin already. Ambulance how long ah?",
  ],
  legal: [
    "Caller: Pak, saya mau report. The recording from last week meeting, ada evidence of insider trading.",
    "Agent: Can you provide the date, time, and participants of the meeting?",
    "Caller: March 3rd, afternoon session. Director Tan and the CFO both on the call. I have the timestamp.",
    "Agent: This will be flagged for OJK regulatory review. Please preserve all related communications.",
    "Caller: Baik. But I need protection lah. Whistleblower protection must be guaranteed.",
  ],
  commerce: [
    "Caller: Sawasdee kha, I looking for the viral skincare set. The one TikTok show, with snail mucin one.",
    "Agent: We have several snail mucin sets. Do you have a preferred brand?",
    "Caller: The Korean one lah, COSRX I think. But I want the bundle with toner also.",
    "Agent: I found the COSRX Advanced Snail Bundle. Shall I add to your cart?",
    "Caller: How much ah? If got free shipping to Bangkok I take two set.",
  ],
  conversational_ai: [
    "Caller: 你好, I need help setting up my smart home. The Alexa cannot understand my accent lah.",
    "Agent: I understand. Which devices are you trying to connect?",
    "Caller: The aircon and the lights. I say 'turn on aircon' but it hear 'turn on bacon'. Walao eh.",
    "Agent: Let me calibrate the voice model for your accent profile.",
    "Caller: Can also add Cantonese commands ah? My mother only speak Cantonese one.",
  ],
  enterprise_ops: [
    "Caller: Team, let's recap the Q1 targets. APAC revenue up 12% but margins squeezed lah.",
    "Agent: Should I flag the margin compression for the board deck?",
    "Caller: Yes, and highlight the Indonesia expansion costs. That one buay tahan the burn rate.",
    "Agent: Noted. I'll structure the action items from this briefing.",
    "Caller: Also need to action the hiring freeze memo. HR to confirm headcount by Friday.",
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
  fintech: { frustration: 0.35, stress: 0.78, politeness: 0.6, hesitation: 0.1, urgency: 0.88 },
  cx_escalation: { frustration: 0.85, stress: 0.7, politeness: 0.3, hesitation: 0.15, urgency: 0.8 },
  healthcare: { frustration: 0.15, stress: 0.92, politeness: 0.75, hesitation: 0.45, urgency: 0.95 },
  legal: { frustration: 0.2, stress: 0.65, politeness: 0.55, hesitation: 0.3, urgency: 0.5 },
  commerce: { frustration: 0.05, stress: 0.1, politeness: 0.9, hesitation: 0.35, urgency: 0.25 },
  conversational_ai: { frustration: 0.6, stress: 0.3, politeness: 0.65, hesitation: 0.2, urgency: 0.4 },
  enterprise_ops: { frustration: 0.25, stress: 0.45, politeness: 0.7, hesitation: 0.1, urgency: 0.6 },
  fraud_security: { frustration: 0.1, stress: 0.9, politeness: 0.15, hesitation: 0.05, urgency: 0.95 },
};

const DEMO_SECURITY: Record<Scenario, SecurityMetrics> = {
  logistics: { syntheticProb: 0.03, behavioralRisk: 0.08, livenessStatus: "verified" },
  fintech: { syntheticProb: 0.02, behavioralRisk: 0.15, livenessStatus: "verified" },
  cx_escalation: { syntheticProb: 0.05, behavioralRisk: 0.12, livenessStatus: "verified" },
  healthcare: { syntheticProb: 0.01, behavioralRisk: 0.04, livenessStatus: "verified" },
  legal: { syntheticProb: 0.04, behavioralRisk: 0.1, livenessStatus: "verified" },
  commerce: { syntheticProb: 0.02, behavioralRisk: 0.03, livenessStatus: "verified" },
  conversational_ai: { syntheticProb: 0.06, behavioralRisk: 0.07, livenessStatus: "verified" },
  enterprise_ops: { syntheticProb: 0.01, behavioralRisk: 0.05, livenessStatus: "verified" },
  fraud_security: { syntheticProb: 0.78, behavioralRisk: 0.92, livenessStatus: "failed" },
};

const DEMO_INTENT: Record<Scenario, IntentLayers> = {
  logistics: {
    literal: "Customer inquiring about delayed shipment at port, requesting expedition of container release.",
    cultural: "Singlish markers ('walao', 'buay tahan', 'lah') indicate genuine frustration, not hostility. 'Kan cheong' implies time pressure from downstream client.",
    trueIntent: "Expedite container release from Tanjong Pagar terminal. Customer's downstream client is pressuring for delivery — risk of churn if unresolved within 24h.",
  },
  fintech: {
    literal: "Client requesting status update on held wire transfer to Shanghai counterparty.",
    cultural: "'Leh' and 'lah' soften urgency but stress is high. Repeated monthly transfer pattern suggests legitimate transaction flagged by overzealous compliance rules.",
    trueIntent: "Escalate KYC hold to compliance officer immediately. Legitimate recurring transfer — false positive flag risks losing high-value client relationship.",
  },
  cx_escalation: {
    literal: "Customer requesting refund after two weeks of unresolved support tickets.",
    cultural: "'Kan cheong spider' is Singlish for extreme anxiety/impatience. 'Leh' softens complaint but frustration is high.",
    trueIntent: "Immediate refund processing required. Customer loyalty at critical risk — potential social media escalation if not resolved this session.",
  },
  healthcare: {
    literal: "Family member reporting elderly patient with chest pain and breathing difficulty.",
    cultural: "'Lola' is Filipino for grandmother. 'Parang tinutusok' means stabbing pain in Tagalog. Caller code-switches between English and Filipino under stress.",
    trueIntent: "PRIORITY TRIAGE: Suspected cardiac event in elderly female. Aspirin administered. Dispatch emergency response immediately — time-critical intervention required.",
  },
  legal: {
    literal: "Whistleblower reporting potential insider trading evidence from recorded meeting.",
    cultural: "'Pak' is respectful Indonesian address. 'Baik' confirms understanding. Caller mixing Bahasa and English indicates formal but anxious reporting. Whistleblower protection concern is culturally significant.",
    trueIntent: "Flag for OJK regulatory review. Preserve meeting recording as evidence. Activate whistleblower protection protocol — caller at risk of retaliation.",
  },
  commerce: {
    literal: "Customer searching for viral Korean skincare bundle with shipping inquiry.",
    cultural: "'Sawasdee kha' is polite Thai greeting. Code-switching to Singlish ('lah', 'ah') suggests Southeast Asian diaspora buyer. Price sensitivity and free shipping are key decision factors.",
    trueIntent: "High purchase intent — customer ready to buy 2x bundles if free shipping confirmed. Upsell opportunity: recommend complementary products. Capture for remarketing.",
  },
  conversational_ai: {
    literal: "User requesting smart home voice assistant calibration for non-standard accent.",
    cultural: "'Walao eh' expresses comedic frustration at ASR failure. 'One' as sentence-final particle is Singlish. Request for Cantonese support indicates multi-generational household.",
    trueIntent: "Calibrate voice model for Singlish-accented English. Add Cantonese command set for secondary user. Core problem: standard ASR fails on regional accents — VALSEA value proposition.",
  },
  enterprise_ops: {
    literal: "Executive team reviewing Q1 APAC performance and actioning operational decisions.",
    cultural: "'Lah' in executive context normalizes casual tone in formal setting. 'Buay tahan' about burn rate conveys strong concern about Indonesia expansion sustainability.",
    trueIntent: "Auto-generate board deck with margin analysis. Action items: hiring freeze memo to HR (deadline Friday), Indonesia expansion cost review. Tag finance team for burn rate assessment.",
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
      shipment_id: "MAEU-2847391", container: "TCLU-7293841", origin_port: "SGSIN",
      destination: "HKHKG", status: "HELD_AT_PORT", priority: "EXPEDITE",
      sla_impact: "HIGH", churn_risk: 0.73, action: "RELEASE_CONTAINER",
    },
  },
  fintech: {
    type: "swift_compliance_gateway",
    data: {
      transaction_id: "SWIFT-HK-20260307-4821", beneficiary: "Shanghai Corp Ltd",
      amount: "USD 2,400,000", hold_reason: "KYC_FLAG", pattern: "RECURRING_MONTHLY",
      risk_score: 0.15, action: "ESCALATE_TO_COMPLIANCE_OFFICER", sla: "2H",
    },
  },
  cx_escalation: {
    type: "zendesk_escalation",
    data: {
      ticket_id: "ZD-48291", customer_id: "CUS-88412", priority: "URGENT",
      sentiment: "CRITICAL_NEGATIVE", resolution: "REFUND_PROCESS",
      escalation_level: 3, churn_probability: 0.89, action: "IMMEDIATE_REFUND",
    },
  },
  healthcare: {
    type: "hl7_fhir_triage",
    data: {
      patient_age: "elderly", symptoms: ["chest_pain_left", "dyspnea", "pallor"],
      triage_level: "EMERGENCY", aspirin_administered: true,
      language: "en-tl", action: "DISPATCH_EMERGENCY_RESPONSE", eta_target: "8min",
    },
  },
  legal: {
    type: "ojk_regulatory_filing",
    data: {
      case_id: "OJK-WB-20260303", allegation: "INSIDER_TRADING",
      subjects: ["Director Tan", "CFO"], evidence_type: "MEETING_RECORDING",
      whistleblower_protection: true, action: "FILE_REGULATORY_REPORT",
    },
  },
  commerce: {
    type: "shopify_commerce_api",
    data: {
      product: "COSRX Advanced Snail Bundle", sku: "COSRX-SNL-BDL-01",
      quantity: 2, shipping_zone: "TH-BKK", free_shipping_eligible: true,
      buyer_intent_score: 0.92, action: "ADD_TO_CART_AND_UPSELL",
    },
  },
  conversational_ai: {
    type: "voice_model_calibration",
    data: {
      primary_accent: "singlish_en", secondary_language: "yue_cantonese",
      device_ecosystem: "alexa", calibration_type: "ACCENT_PROFILE",
      asr_error_rate_before: 0.34, action: "DEPLOY_CUSTOM_VOICE_MODEL",
    },
  },
  enterprise_ops: {
    type: "enterprise_workflow_engine",
    data: {
      meeting_type: "Q1_REVIEW", region: "APAC", revenue_delta: "+12%",
      margin_alert: true, action_items: [
        { owner: "Finance", task: "Indonesia burn rate review", deadline: "2026-03-14" },
        { owner: "HR", task: "Confirm headcount freeze", deadline: "2026-03-14" },
      ],
      action: "GENERATE_BOARD_DECK",
    },
  },
  fraud_security: {
    type: "mas_regulatory_alert",
    data: {
      alert_id: "MAS-SEC-20260307", threat_type: "SOCIAL_ENGINEERING",
      severity: "CRITICAL", synthetic_voice_prob: 0.78,
      behavioral_fraud_score: 0.92, action: "TERMINATE_AND_ALERT",
      regulatory_body: "MAS", report_to: "DBS_FRAUD_UNIT",
    },
  },
};

// ─── Prosody Bar ─────────────────────────────────────────────────────────────

function getSeverity(scenario: Scenario): { label: string; color: string; bg: string } {
  if (scenario === "fraud_security") return { label: "CRITICAL", color: "var(--danger)", bg: "rgba(239,68,68,0.1)" };
  if (scenario === "healthcare") return { label: "CRITICAL", color: "var(--danger)", bg: "rgba(239,68,68,0.1)" };
  if (scenario === "cx_escalation" || scenario === "fintech" || scenario === "legal") return { label: "HIGH", color: "var(--warning)", bg: "rgba(245,158,11,0.1)" };
  return { label: "MEDIUM", color: "var(--success)", bg: "rgba(34,197,94,0.1)" };
}

function ProsodyBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs font-medium text-[var(--muted-light)] tracking-wide">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--bar-track)] overflow-hidden">
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
              ? { height: [8, Math.random() * 48 + 8, 8] }
              : { height: 8 }
          }
          transition={
            isActive
              ? { duration: 0.4 + Math.random() * 0.4, repeat: Infinity, repeatType: "reverse", delay: i * 0.02 }
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

export default function Dashboard() {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeScenario, setActiveScenario] = useState<Scenario>("logistics");
  const [eventSidebarOpen, setEventSidebarOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [demoPhase, setDemoPhase] = useState<"idle" | "streaming" | "complete">("idle");
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [emotions, setEmotions] = useState<EmotionScores>({ frustration: 0, stress: 0, politeness: 0, hesitation: 0, urgency: 0 });
  const [security, setSecurity] = useState<SecurityMetrics>({ syntheticProb: 0, behavioralRisk: 0, livenessStatus: "scanning" });
  const [intent, setIntent] = useState<IntentLayers>({ literal: "", cultural: "", trueIntent: "" });
  const [payload, setPayload] = useState<EnterprisePayload | null>(null);
  const [streamStats] = useState({ streams: 1402, p50: 124, regions: 12, alerts: 0 });

  // ── Vapi WebRTC Live Streaming ────────────────────────────────────────
  const [vapiStatus, setVapiStatus] = useState<"idle" | "connecting" | "active">("idle");
  const [liveTranscript, setLiveTranscript] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [latencyMs, setLatencyMs] = useState(0);
  const vapiRef = useRef<any>(null);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalysisRef = useRef<string>("");

  // Initialize Vapi
  useEffect(() => {
    const key = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (key) {
      const vapiModule = "@vapi-ai/web";
      import(/* @vite-ignore */ vapiModule).then((mod) => {
        vapiRef.current = new mod.default(key);
      }).catch(() => {
        console.warn("Vapi SDK not available");
      });
    }
    return () => {
      vapiRef.current?.removeAllListeners();
      vapiRef.current?.stop();
    };
  }, []);

  // Run analysis on accumulated transcript
  const runLiveAnalysis = useCallback(async (text: string) => {
    if (!text.trim() || text === lastAnalysisRef.current) return;
    lastAnalysisRef.current = text;

    try {
      const data = await analyzeDialog(text);

      setEmotions({
        frustration: data.emotions?.frustration ?? 0,
        stress: data.emotions?.anxiety ?? 0,
        politeness: data.emotions?.politeness ?? 0,
        hesitation: 0,
        urgency: data.emotions?.confidence ?? 0,
      });
      setSecurity({
        syntheticProb: data.security?.deepfakeProb ?? 0,
        behavioralRisk: data.security?.threatFlag ? 0.85 : 0.05,
        livenessStatus: data.security?.threatFlag ? "failed" : "verified",
      });
      setIntent({
        literal: data.cognitive?.translation ?? "",
        cultural: data.cognitive?.cultural_context ?? "",
        trueIntent: data.cognitive?.intent ?? "",
      });
      setPayload({
        type: "vapi_live_analysis",
        data: {
          summary: data.summary,
          fraud_verdict: data.cognitive?.fraud_verdict,
          action_advised: data.cognitive?.action_advised,
          risk_level: data.security?.riskLevel,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[VAPI Live] Analysis failed:", err);
      showToast(classifyError(err));
    }
  }, []);

  // Schedule debounced analysis
  const scheduleAnalysis = useCallback((transcriptLines: { role: string; text: string }[]) => {
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = setTimeout(() => {
      const fullText = transcriptLines.map((l) => `${l.role === "user" ? "Caller" : "Agent"}: ${l.text}`).join("\n");
      runLiveAnalysis(fullText);
    }, 2000);
  }, [runLiveAnalysis]);

  const startVapiCall = useCallback(async () => {
    const vapi = vapiRef.current;
    if (!vapi) {
      console.warn("Vapi not initialized — check VITE_VAPI_PUBLIC_KEY");
      return;
    }

    setVapiStatus("connecting");
    setLiveTranscript([]);
    setDemoPhase("streaming");
    setEmotions({ frustration: 0, stress: 0, politeness: 0, hesitation: 0, urgency: 0 });
    setSecurity({ syntheticProb: 0, behavioralRisk: 0, livenessStatus: "scanning" });
    setIntent({ literal: "", cultural: "", trueIntent: "" });
    setPayload(null);
    lastAnalysisRef.current = "";
    const startTime = Date.now();

    vapi.removeAllListeners();

    vapi.on("call-start", () => {
      setVapiStatus("active");
      setLatencyMs(Date.now() - startTime);
    });

    vapi.on("call-end", () => {
      setVapiStatus("idle");
      setLiveTranscript((prev) => {
        const fullText = prev.map((l) => `${l.role === "user" ? "Caller" : "Agent"}: ${l.text}`).join("\n");
        runLiveAnalysis(fullText);
        return prev;
      });
      setDemoPhase("complete");
    });

    vapi.on("message", (msg: any) => {
      if (msg.type === "transcript" && msg.transcriptType === "final" && msg.transcript) {
        const role: "user" | "assistant" = msg.role === "user" ? "user" : "assistant";
        setLiveTranscript((prev) => {
          const updated = [...prev, { role, text: msg.transcript }];
          scheduleAnalysis(updated);
          return updated;
        });
      }
    });

    vapi.on("error", (error: Error) => {
      console.error("[Vapi Error]", error);
      setVapiStatus("idle");
      setDemoPhase("idle");
      showToast(classifyError(error));
    });

    try {
      await vapi.start({
        transcriber: {
          provider: "google",
          model: "telephony",
          language: "en-US",
        },
        model: {
          provider: "google",
          model: "gemini-1.5-flash",
          messages: [
            {
              role: "system",
              content: `You are the VALSEA honeypot AI layer. Speak briefly and act like a polite but confused customer service operative. Keep the user talking so VALSEA can analyze their speech patterns, intent, and cultural context.`,
            },
          ],
        },
        firstMessage: "Hello, this is Sentinel Voice. How can I help you today?",
      } as any);
    } catch (err) {
      console.error("[Vapi Start Error]", err);
      setVapiStatus("idle");
      setDemoPhase("idle");
      showToast(classifyError(err));
    }
  }, [runLiveAnalysis, scheduleAnalysis]);

  const stopVapiCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  // Microphone recording fallback
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // In Vite mode without a backend API, audio recording won't have STT.
        // Show a message instead.
        setIsAnalyzingAudio(true);
        setDemoPhase("streaming");
        try {
          const apiUrl = import.meta.env.VITE_ANALYZE_API_URL;
          if (apiUrl) {
            const file = new File([blob], "recording.webm", { type: "audio/webm" });
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(apiUrl, { method: "POST", body: formData });
            if (res.ok) {
              const data = await res.json();
              setEmotions({
                frustration: data.emotions?.frustration ?? 0,
                stress: data.emotions?.anxiety ?? 0,
                politeness: data.emotions?.politeness ?? 0,
                hesitation: 0,
                urgency: data.emotions?.confidence ?? 0,
              });
              setSecurity({
                syntheticProb: data.security?.deepfakeProb ?? 0,
                behavioralRisk: data.security?.threatFlag ? 0.85 : 0.05,
                livenessStatus: data.security?.threatFlag ? "failed" : "verified",
              });
              setIntent({
                literal: data.cognitive?.translation ?? "",
                cultural: data.cognitive?.cultural_context ?? "",
                trueIntent: data.cognitive?.intent ?? "",
              });
              setPayload({
                type: "live_audio_analysis",
                data: {
                  summary: data.summary,
                  fraud_verdict: data.cognitive?.fraud_verdict,
                  action_advised: data.cognitive?.action_advised,
                  risk_level: data.security?.riskLevel,
                  timestamp: new Date().toISOString(),
                },
              });
              setDemoPhase("complete");
            } else {
              setDemoPhase("idle");
              showToast(classifyError(new Error(`Audio analysis error: ${res.status}`)));
            }
          } else {
            console.warn("No VITE_ANALYZE_API_URL configured — audio analysis unavailable in demo mode");
            setDemoPhase("idle");
            showToast("Audio analysis not configured in demo mode.", "warning");
          }
        } catch (err) {
          setDemoPhase("idle");
          showToast(classifyError(err));
        } finally {
          setIsAnalyzingAudio(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      showToast("Microphone access denied — please allow microphone permissions.", "warning");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

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

  useEffect(() => {
    resetDemo();
  }, [activeScenario]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--foreground)]">VALSEA</span>
                <span className="hidden sm:block text-[10px] -mt-0.5 tracking-[0.2em] uppercase text-[var(--muted)]">Speech Intelligence</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-5 text-xs text-[var(--muted)] font-mono">
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

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setEventSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bar-track)] hover:bg-[var(--accent-glow)] transition-colors"
              title="Event Context"
            >
              <PanelLeftOpen className="w-4 h-4 text-[var(--muted-light)]" />
            </button>
            <div className="hidden md:flex items-center bg-[var(--bar-track)] rounded-lg p-0.5 overflow-x-auto max-w-[600px] lg:max-w-none">
              {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveScenario(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeScenario === key
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--muted-light)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {SCENARIOS[key].label}
                </button>
              ))}
            </div>

            <select
              value={activeScenario}
              onChange={(e) => setActiveScenario(e.target.value as Scenario)}
              className="md:hidden text-[10px] font-medium bg-[var(--bar-track)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-[var(--foreground)]"
            >
              {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
                <option key={key} value={key}>{SCENARIOS[key].label}</option>
              ))}
            </select>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bar-track)] hover:bg-[var(--accent-glow)] transition-colors"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4 text-[var(--muted-light)]" /> : <Sun className="w-4 h-4 text-[var(--warning)]" />}
            </button>

            <button
              onClick={isRunning ? resetDemo : runDemo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{
                background: isRunning ? "var(--danger)" : "var(--brand-gradient)",
              }}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3" /> <span className="hidden sm:inline">STOP</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> <span className="hidden sm:inline">RUN DEMO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Event Context Sidebar ──────────────────────────────── */}
      <AnimatePresence>
        {eventSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setEventSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full w-[300px] max-w-[85vw] bg-[var(--surface)] border-r border-[var(--card-border)] shadow-2xl lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--accent-light)]" />
                  <span className="text-xs font-semibold tracking-[0.15em] uppercase">Event Context</span>
                </div>
                <button
                  onClick={() => setEventSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bar-track)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--muted-light)]" />
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1"><Radio className="w-3 h-3" /> Source</span>
                    <p className="font-semibold mt-1">{config.source}</p>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1"><Globe className="w-3 h-3" /> Target</span>
                    <p className="font-semibold mt-1">{config.target}</p>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1"><FileText className="w-3 h-3" /> Scenario</span>
                    <p className="font-semibold mt-1">{config.scenario}</p>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1">⏱ Time</span>
                    <p className="font-semibold mt-1">Now</p>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1"><Eye className="w-3 h-3" /> Confidence</span>
                    <p className="font-semibold mt-1 font-mono">{demoPhase === "complete" ? "94%" : "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--muted)] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Severity</span>
                    <p className="font-semibold mt-1">
                      {demoPhase === "complete" ? (
                        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                          color: getSeverity(activeScenario).color,
                          background: getSeverity(activeScenario).bg,
                        }}>
                          {getSeverity(activeScenario).label}
                        </span>
                      ) : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] pulse-dot" />
                    LIVE MONITORING
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Dashboard Grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Row 1: Event Context | Prosody | Security */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Event Context - hidden on mobile, use sidebar instead */}
          <div className="hidden lg:block lg:col-span-3 panel p-4 sm:p-5">
            <PanelHeader icon={Globe} title="Event Context" badge="LIVE" badgeColor="#22c55e" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
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
                        color: getSeverity(activeScenario).color,
                        background: getSeverity(activeScenario).bg,
                      }}
                    >
                      {getSeverity(activeScenario).label}
                    </span>
                  ) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Prosody Analysis */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-5 panel p-4 sm:p-5">
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
          <div className="col-span-1 sm:col-span-1 lg:col-span-4 panel p-4 sm:p-5">
            <PanelHeader icon={Shield} title="Security Layer" badge="MODULATE" badgeColor="#a855f7" />
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-mono tracking-wider text-[var(--muted-light)]">SYNTHETIC PROB.</span>
                <span className="text-sm font-mono font-semibold">
                  {demoPhase === "complete" ? `${Math.round(security.syntheticProb * 100)}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-mono tracking-wider text-[var(--muted-light)]">BEHAVIORAL RISK</span>
                <span className="text-sm font-mono font-semibold">
                  {demoPhase === "complete" ? `${Math.round(security.behavioralRisk * 100)}%` : "—"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Acoustic Layer */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-3 panel p-4 sm:p-5">
            <PanelHeader
              icon={Mic}
              title="Acoustic Layer"
              badge={
                vapiStatus === "active" ? "LIVE STREAM" :
                vapiStatus === "connecting" ? "CONNECTING" :
                isRecording ? "RECORDING" :
                isAnalyzingAudio ? "ANALYZING" :
                demoPhase === "streaming" ? "ACTIVE" : "IDLE"
              }
              badgeColor={
                vapiStatus === "active" ? "#22c55e" :
                vapiStatus === "connecting" ? "#f59e0b" :
                isRecording ? "#ef4444" :
                isAnalyzingAudio ? "#f59e0b" :
                demoPhase === "streaming" ? "#22c55e" : undefined
              }
            />
            <div className="mt-4">
              <WaveformVisualizer isActive={vapiStatus === "active" || isRecording || demoPhase === "streaming"} />
            </div>

            {vapiStatus === "active" && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[var(--success)]">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] pulse-dot" />
                WebRTC Stream Active
              </div>
            )}
            {vapiStatus === "connecting" && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[var(--warning)]">
                <Loader2 className="w-3 h-3 animate-spin" /> Connecting to Vapi...
              </div>
            )}

            {isRecording && vapiStatus === "idle" && (
              <div className="text-center mt-3">
                <span className="text-lg font-mono font-semibold text-[var(--danger)]">{formatTime(recordingTime)}</span>
              </div>
            )}
            {isAnalyzingAudio && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[var(--warning)]">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing audio...
              </div>
            )}

            <div className="flex flex-col items-center gap-2 mt-4">
              <button
                onClick={vapiStatus !== "idle" ? stopVapiCall : startVapiCall}
                disabled={isRecording || isAnalyzingAudio || isRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all disabled:opacity-50 w-full justify-center"
                style={{
                  background: vapiStatus !== "idle" ? "var(--danger)" : "var(--brand-gradient)",
                  color: "white",
                }}
              >
                {vapiStatus === "active" ? (
                  <><PhoneOff className="w-3 h-3" /> End Live Call</>
                ) : vapiStatus === "connecting" ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</>
                ) : (
                  <><PhoneCall className="w-3 h-3" /> Start Live Call</>
                )}
              </button>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAnalyzingAudio || vapiStatus !== "idle" || isRunning}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all disabled:opacity-30 border border-[var(--border-subtle)] text-[var(--muted-light)] hover:text-[var(--foreground)]"
              >
                {isRecording ? (
                  <><Square className="w-2.5 h-2.5" /> Stop Mic</>
                ) : (
                  <><Mic className="w-2.5 h-2.5" /> Record &amp; Analyze</>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1">
                <Radio className="w-3 h-3" /> VAPI WEBRTC
              </span>
              <span className="text-[10px] font-mono text-[var(--muted)]">
                {vapiStatus === "active" ? `${latencyMs}ms` : isRecording ? "LIVE" : demoPhase === "streaming" ? "128ms" : "0ms"} LATENCY
              </span>
            </div>
          </div>

          {/* Transcription */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-5 panel p-4 sm:p-5">
            <PanelHeader
              icon={FileText}
              title="Transcription"
              badge={vapiStatus === "active" ? "VAPI LIVE" : "CHIRP USM"}
              badgeColor={vapiStatus === "active" ? "#22c55e" : "#06b6d4"}
            />
            <div className="min-h-[200px] max-h-[260px] overflow-y-auto pr-2">
              {liveTranscript.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {liveTranscript.map((line, i) => {
                      const singlishWords = ["lah", "leh", "lor", "walao", "wah", "aiya", "buay tahan", "kan cheong", "sotong", "buay"];
                      let highlighted = line.text;
                      singlishWords.forEach((w) => {
                        const regex = new RegExp(`\\b${w}\\b`, "gi");
                        highlighted = highlighted.replace(regex, `<mark class="bg-[var(--accent-glow)] text-[var(--accent-light)] px-1 rounded font-medium">${w}</mark>`);
                      });

                      return (
                        <motion.div
                          key={`live-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`text-sm leading-relaxed p-2 rounded-lg ${
                            line.role === "user" ? "bg-[var(--line-bg-caller)]" : "bg-[var(--line-bg-agent)] ml-4"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-[var(--muted)] block mb-0.5">
                            {line.role === "user" ? "CALLER" : "AGENT"}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {vapiStatus === "active" && (
                    <div className="flex items-center gap-2 text-xs text-[var(--success)] mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] pulse-dot" />
                      Streaming live...
                    </div>
                  )}
                </div>
              ) : demoPhase === "idle" && vapiStatus === "idle" ? (
                <p className="text-sm text-[var(--muted)] italic mt-12 text-center">
                  Awaiting audio stream...
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {transcript.slice(0, visibleLines).map((line, i) => {
                      const isCaller = line.toLowerCase().startsWith("caller") || line.toLowerCase().startsWith("customer") || line.toLowerCase().startsWith("target");
                      const text = line.replace(/^(Caller|Agent|Customer|Target):\s*/i, "");
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
                            isCaller ? "bg-[var(--line-bg-caller)]" : "bg-[var(--line-bg-agent)] ml-4"
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
                  {demoPhase === "streaming" && vapiStatus === "idle" && (
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
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 panel p-4 sm:p-5">
            <PanelHeader icon={Brain} title="Intent Engine" badge="GEMINI 2.5 PRO" badgeColor="#818cf8" />
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--bar-track)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono tracking-wider text-[var(--muted)] block mb-1.5">LITERAL TRANSLATION</span>
                <p className="text-xs leading-relaxed text-[var(--muted-light)]">
                  {intent.literal || <span className="italic text-[var(--muted)]">—</span>}
                </p>
              </div>
              <div className="flex justify-center">
                <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div className="p-3 rounded-lg bg-[var(--bar-track)] border border-[var(--border-subtle)]">
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
        <div className="panel p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent-light)]" />
              <span className="text-xs font-semibold tracking-[0.15em] uppercase">Enterprise Action</span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-[var(--muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
              JSON PAYLOAD
            </span>
          </div>

          {payload ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <pre className="text-xs font-mono leading-relaxed text-[var(--muted-light)] bg-[var(--code-bg)] rounded-lg p-4 overflow-x-auto">
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
