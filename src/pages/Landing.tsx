import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Ship,
  Landmark,
  Headphones,
  HeartPulse,
  Scale,
  ShoppingBag,
  BrainCircuit,
  Building2,
  ArrowRight,
  Shield,
  Mic,
  Activity,
  Sun,
  Moon,
} from "lucide-react";

interface Vertical {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}

const VERTICALS: Vertical[] = [
  {
    key: "logistics",
    icon: Ship,
    title: "Supply Chain & Logistics",
    description:
      "Multilingual freight instructions, cross-border procurement, voice-to-TMS automation. No bilingual staff required.",
    accent: "var(--cyan)",
  },
  {
    key: "fintech",
    icon: Landmark,
    title: "Financial Services & Fintech",
    description:
      "Real-time fraud detection, compliance monitoring, voice-authenticated transactions — across every accent and dialect.",
    accent: "var(--success)",
  },
  {
    key: "cx",
    icon: Headphones,
    title: "Contact Centres & CX",
    description:
      "Intent extraction, complaint detection, churn signals, and structured CRM updates from live agent calls in world languages.",
    accent: "var(--warning)",
  },
  {
    key: "healthcare",
    icon: HeartPulse,
    title: "Healthcare",
    description:
      "Clinical voice notes, multilingual patient intake, triage instructions — structured, safe, and system-ready.",
    accent: "var(--danger)",
  },
  {
    key: "legal",
    icon: Scale,
    title: "Legal & Compliance",
    description:
      "Timestamped, jurisdiction-aware voice evidence trails. Proactive monitoring for MAS, HKMA, OJK and equivalent regulators.",
    accent: "var(--purple)",
  },
  {
    key: "commerce",
    icon: ShoppingBag,
    title: "Commerce & Retail",
    description:
      "Voice-driven product discovery, seller instructions, buyer intent — understood across every dialect and market.",
    accent: "#f472b6",
  },
  {
    key: "conversational_ai",
    icon: BrainCircuit,
    title: "Conversational AI & LLMs",
    description:
      "LLM pipelines need reliable multilingual speech input. VALSEA is the accurate structuring layer they currently lack.",
    accent: "var(--accent)",
  },
  {
    key: "enterprise",
    icon: Building2,
    title: "Enterprise Operations",
    description:
      "Meetings, briefings, internal workflows — structured and actioned without manual transcription overhead.",
    accent: "var(--muted-light)",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0, 1] as [number, number, number, number] } },
};

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  });

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: "var(--brand-gradient)" }}
      />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--bar-track)] hover:bg-[var(--accent-glow)] transition-colors border border-[var(--border-subtle)]"
      >
        {theme === "light" ? (
          <Moon className="w-4 h-4 text-[var(--muted-light)]" />
        ) : (
          <Sun className="w-4 h-4 text-[var(--warning)]" />
        )}
      </button>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0, 1] }}
          className="text-center mb-16 sm:mb-20"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Globe className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--brand-gradient)" }}>
              VALSEA
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--muted-light)] max-w-2xl mx-auto leading-relaxed mb-3">
            Voice-to-Action Logistics & Sentiment Engine
          </p>

          <p className="text-sm text-[var(--muted)] max-w-xl mx-auto leading-relaxed mb-8">
            Bridging the chasm between what is said, how it's felt, and what is meant.
          </p>

          {/* Pipeline icons */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10 text-[var(--muted)]">
            {[
              { icon: Mic, label: "Acoustic" },
              { icon: Activity, label: "Prosody" },
              { icon: Shield, label: "Security" },
              { icon: BrainCircuit, label: "Cognitive" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bar-track)] border border-[var(--border-subtle)] flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-[var(--accent-light)]" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-wider uppercase">{step.label}</span>
                </div>
                {i < 3 && <ArrowRight className="w-3 h-3 text-[var(--border-subtle)] mt-[-14px]" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-[var(--muted)] block mb-2">
            The Verticals VALSEA Powers
          </span>
          <p className="text-xs sm:text-sm text-[var(--muted-light)] max-w-lg mx-auto">
            One speech infrastructure layer. Every industry where voice drives operations, risk, and revenue.
          </p>
        </motion.div>

        {/* Vertical Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-14"
        >
          {VERTICALS.map((v) => (
            <motion.div
              key={v.key}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="panel p-5 cursor-default group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: `${v.accent}12`,
                  border: `1px solid ${v.accent}25`,
                }}
              >
                <v.icon className="w-5 h-5" style={{ color: v.accent }} />
              </div>
              <h3 className="text-sm font-semibold mb-2 tracking-tight">{v.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--muted-light)]">{v.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mb-12"
        >
          <blockquote className="text-xs sm:text-sm italic text-[var(--muted)] max-w-2xl mx-auto leading-relaxed px-4">
            "VALSEA does not compete in any vertical. It powers all of them — as the invisible infrastructure layer behind every voice workflow."
          </blockquote>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex justify-center"
        >
          <button
            onClick={onEnter}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--brand-gradient)" }}
          >
            Enter Intelligence Dashboard
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </main>
  );
}
