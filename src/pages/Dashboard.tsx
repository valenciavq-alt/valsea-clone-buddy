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
  Check,
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

type Scenario =
  | "logistics"
  | "fintech"
  | "cx_escalation"
  | "legal"
  | "conversational_ai"
  | "fraud_security"
  | "carousell_cx"
  | "coke_vn_complaint"
  | "coke_vn_supplier"
  | "multilingual_cjk"
  | "multilingual_vn";

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
  legal: {
    label: "Legal",
    source: "Indonesia",
    target: "Compliance Hub",
    scenario: "Regulatory Evidence",
  },
  conversational_ai: {
    label: "Conv. AI",
    source: "Multi-region",
    target: "LLM Pipeline",
    scenario: "Speech Structuring Layer",
  },
  fraud_security: {
    label: "Security",
    source: "Unknown",
    target: "Security Hub",
    scenario: "Fraud Detection",
  },
  carousell_cx: {
    label: "Carousell CX",
    source: "Singapore",
    target: "Carousell Platform",
    scenario: "Marketplace Trust & Safety",
  },
  coke_vn_complaint: {
    label: "Coca-Cola VN — Complaint",
    source: "Hà Nội, Vietnam",
    target: "Coca-Cola Consumer Hotline",
    scenario: "Consumer Complaint (Vietnamese)",
  },
  coke_vn_supplier: {
    label: "Coca-Cola VN — B2B Order",
    source: "Đà Nẵng, Vietnam",
    target: "Coca-Cola Distributor Portal",
    scenario: "Supplier Bulk Order (Vietnamese)",
  },
  multilingual_cjk: {
    label: "Multilingual — CJK + EN",
    source: "Hong Kong ⇄ Tokyo ⇄ Seoul",
    target: "Global Conference Bridge",
    scenario: "Cantonese · English · Mandarin · Japanese · Korean",
  },
  multilingual_vn: {
    label: "Multilingual — Vietnamese",
    source: "Ho Chi Minh City ⇄ Singapore",
    target: "Cross-Border CX Platform",
    scenario: "Vietnamese · English · Mandarin code-switching",
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
  legal: [
    "Caller: Pak, saya mau report. The recording from last week meeting, ada evidence of insider trading.",
    "Agent: Can you provide the date, time, and participants of the meeting?",
    "Caller: March 3rd, afternoon session. Director Tan and the CFO both on the call. I have the timestamp.",
    "Agent: This will be flagged for OJK regulatory review. Please preserve all related communications.",
    "Caller: Baik. But I need protection lah. Whistleblower protection must be guaranteed.",
  ],
  conversational_ai: [
    "Caller: 你好, I need help setting up my smart home. The Alexa cannot understand my accent lah.",
    "Agent: I understand. Which devices are you trying to connect?",
    "Caller: The aircon and the lights. I say 'turn on aircon' but it hear 'turn on bacon'. Walao eh.",
    "Agent: Let me calibrate the voice model for your accent profile.",
    "Caller: Can also add Cantonese commands ah? My mother only speak Cantonese one.",
  ],
  fraud_security: [
    "Caller: Hello, this is the bank security department. Your account has been compromised.",
    "Caller: You need to transfer your funds immediately to this safe account.",
    "Caller: I need your OTP number now. The police are involved.",
    "Target: Uh... okay, let me check—",
    "Caller: Do it NOW. Your money will be frozen if you don't act immediately.",
  ],
  carousell_cx: [
    "Buyer: Hi, the iPhone 15 Pro Max still available? I see your listing — can meet today?",
    "Seller: Ya still got! Condition 10/10, I baby this phone one. You want come see first?",
    "Buyer: Walao eh bro, you asking $1,400 ah? Siao lah. I check already, market price around $1,000 only. Don't lowball me but also don't overprice leh.",
    "Seller: Eh bro, this one got AppleCare+ until December, original box, cable everything. You go Apple store see how much. Serious buyer then come, $1,300 last price can already.",
    "Buyer: Aiya, okay lah $1,200 I take. I rush down Tampines MRT now. Cash ready. But ah — please don't last minute MIA. Last two sellers pangseh me already, damn sian.",
    "Seller: Confirm lah bro, I not that kind one. See you 6pm. I wear red shirt, easy spot.",
  ],
  coke_vn_complaint: [
    "Khách: Alo, Coca-Cola Việt Nam phải không? Tôi muốn khiếu nại về cuộc gọi vừa rồi nha.",
    "Agent: Dạ em xin nghe, anh cứ trình bày ạ.",
    "Khách: Trời ơi em ơi, tổng đài viên hồi nãy nói chuyện cộc lốc với anh quá trời. Anh gọi báo lon Coke Zero bị phồng, mà bạn đó nói 'anh tự đem ra siêu thị đổi đi' rồi cúp máy luôn á!",
    "Agent: Dạ em thành thật xin lỗi anh về thái độ của bạn agent đó. Anh cho em xin số điện thoại để em pull lại record cuộc gọi nha.",
    "Khách: 0908-xxx-432. Anh mua nguyên thùng 24 lon ở Bách Hoá Xanh Cầu Giấy, mã lô in dưới đáy là L23-CCVN-0842. Uống vô là sốc luôn, ga xì như bom, may là chưa cho con nít uống.",
    "Agent: Dạ em ghi nhận. Em sẽ chuyển case này lên Quality Assurance và escalate thái độ agent lên team lead trong hôm nay.",
    "Khách: Anh nói thiệt, Coca-Cola là thương hiệu lớn mà CSKH kiểu này là vô tri lắm nha. Anh đang livestream review trên TikTok, mấy chục ngàn follower coi đó. Bên em xử lý đàng hoàng thì anh gỡ, không thôi là viral đó nha em.",
  ],
  coke_vn_supplier: [
    "Đại lý: Alo em ơi, anh Tâm bên đại lý Tâm Phát Đà Nẵng nè. Anh cần đặt thêm hàng gấp cho dịp Tết.",
    "Agent: Dạ em chào anh Tâm, anh cần đặt mặt hàng nào ạ?",
    "Đại lý: Cho anh 100 thùng Coca-Cola Original lon 330ml, SKU là CCVN-ORG-330-24. Mỗi thùng 24 lon nha em, tổng là 2400 lon đó.",
    "Agent: Dạ em ghi nhận 100 carton SKU CCVN-ORG-330-24. Anh muốn giao về kho nào ạ?",
    "Đại lý: Giao về số 245 Nguyễn Văn Linh, phường Vĩnh Trung, quận Thanh Khê, Đà Nẵng. Kho anh mở cửa từ 7 giờ sáng tới 6 giờ chiều.",
    "Agent: Dạ. Anh cần ngày giao là khi nào ạ?",
    "Đại lý: Giao giùm anh đúng ngày 28 tháng 1 năm 2026, trước Tết một tuần đó. Trễ một ngày là anh cháy hàng luôn nha em, mấy quán ăn đặt ầm ầm rồi.",
    "Agent: Dạ em chốt đơn PO-CCVN-DN-20260128-0917, giao ngày 28/01/2026, mã vận đơn tracking là CCVN-TRK-7742039. Em gửi xác nhận qua Zalo cho anh liền nha.",
    "Đại lý: Đỉnh luôn á em. Nhớ gửi tracking để anh theo dõi, có gì delay là call anh liền nghen.",
  ],
  multilingual_cjk: [
    "Caller (HK): Hello, 早晨 (jóusàhn)! I'm joining from Hong Kong, 我哋想 confirm个 launch date for 东京 release.",
    "Tokyo: お疲れ様です。Tokyo-side, we are ready, but 在庫 (zaiko) inventory is tight — 来月 maybe better lah?",
    "Caller (HK): 唔得啊, 客户 already 收到 announcement. We must launch 下个月一号. Can or not?",
    "Seoul: 잠시만요 (jamsimanyo), wait — Seoul logistics, 우리는 (uri-neun) we can ship from Busan port 25일까지. 大丈夫です (daijōbu desu).",
    "Tokyo: ありがとう Park-san. 那么 Mandarin SKU 包装 we share with Seoul, 韓国語 label add 一起 print.",
    "Caller (HK): Perfect, 咁就 confirm. Send 邮件 in English so 全部人 (chyùhnbouhyàn) can read 啦.",
    "Seoul: 알겠습니다 (algetseumnida). One file, English summary, attach 中文/日本語/한국어 spec sheets.",
  ],
  multilingual_vn: [
    "Khách (HCMC): Alo em ơi, chị gọi từ Sài Gòn nè. Chị need to confirm cái order ship qua Singapore tuần sau.",
    "Agent (SG): Hi chị, no problem. Can you share the PO number? 我可以同步去 warehouse system 啦.",
    "Khách: PO là VN-SG-20260322-0041. Mặt hàng là cà phê G7, 50 thùng. Ship via Cát Lái port, okay không em?",
    "Agent: 五十 cartons, noted. Cát Lái to Tuas — ETA around 6 days lah. Anything urgent ah chị?",
    "Khách: Ừ, hơi gấp. Khách Singapore của chị muốn nhận trước 30 tháng 3, không thì họ cancel luôn á. Trời ơi căng lắm.",
    "Agent: Don't worry chị, I'll flag as priority. 我会 push customs team 加快 clearance. We'll send tracking qua Zalo.",
    "Khách: Cảm ơn em nhiều nha. Em handle multilingual giỏi quá, đỉnh luôn — that's why chị stay with your platform.",
  ],
};

const DEMO_EMOTIONS: Record<Scenario, EmotionScores> = {
  logistics: { frustration: 0.72, stress: 0.55, politeness: 0.45, hesitation: 0.2, urgency: 0.68 },
  fintech: { frustration: 0.35, stress: 0.78, politeness: 0.6, hesitation: 0.1, urgency: 0.88 },
  cx_escalation: { frustration: 0.85, stress: 0.7, politeness: 0.3, hesitation: 0.15, urgency: 0.8 },
  legal: { frustration: 0.2, stress: 0.65, politeness: 0.55, hesitation: 0.3, urgency: 0.5 },
  conversational_ai: { frustration: 0.6, stress: 0.3, politeness: 0.65, hesitation: 0.2, urgency: 0.4 },
  fraud_security: { frustration: 0.1, stress: 0.9, politeness: 0.15, hesitation: 0.05, urgency: 0.95 },
  carousell_cx: { frustration: 0.68, stress: 0.42, politeness: 0.38, hesitation: 0.12, urgency: 0.72 },
  coke_vn_complaint: { frustration: 0.82, stress: 0.6, politeness: 0.4, hesitation: 0.08, urgency: 0.78 },
  coke_vn_supplier: { frustration: 0.18, stress: 0.32, politeness: 0.78, hesitation: 0.1, urgency: 0.7 },
  multilingual_cjk: { frustration: 0.28, stress: 0.55, politeness: 0.82, hesitation: 0.22, urgency: 0.7 },
  multilingual_vn: { frustration: 0.42, stress: 0.6, politeness: 0.75, hesitation: 0.18, urgency: 0.78 },
};

const DEMO_SECURITY: Record<Scenario, SecurityMetrics> = {
  logistics: { syntheticProb: 0.03, behavioralRisk: 0.08, livenessStatus: "verified" },
  fintech: { syntheticProb: 0.02, behavioralRisk: 0.15, livenessStatus: "verified" },
  cx_escalation: { syntheticProb: 0.05, behavioralRisk: 0.12, livenessStatus: "verified" },
  legal: { syntheticProb: 0.04, behavioralRisk: 0.1, livenessStatus: "verified" },
  conversational_ai: { syntheticProb: 0.06, behavioralRisk: 0.07, livenessStatus: "verified" },
  fraud_security: { syntheticProb: 0.78, behavioralRisk: 0.92, livenessStatus: "failed" },
  carousell_cx: { syntheticProb: 0.04, behavioralRisk: 0.22, livenessStatus: "verified" },
  coke_vn_complaint: { syntheticProb: 0.02, behavioralRisk: 0.18, livenessStatus: "verified" },
  coke_vn_supplier: { syntheticProb: 0.01, behavioralRisk: 0.04, livenessStatus: "verified" },
  multilingual_cjk: { syntheticProb: 0.02, behavioralRisk: 0.06, livenessStatus: "verified" },
  multilingual_vn: { syntheticProb: 0.02, behavioralRisk: 0.08, livenessStatus: "verified" },
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
  legal: {
    literal: "Whistleblower reporting potential insider trading evidence from recorded meeting.",
    cultural: "'Pak' is respectful Indonesian address. 'Baik' confirms understanding. Caller mixing Bahasa and English indicates formal but anxious reporting. Whistleblower protection concern is culturally significant.",
    trueIntent: "Flag for OJK regulatory review. Preserve meeting recording as evidence. Activate whistleblower protection protocol — caller at risk of retaliation.",
  },
  conversational_ai: {
    literal: "User requesting smart home voice assistant calibration for non-standard accent.",
    cultural: "'Walao eh' expresses comedic frustration at ASR failure. 'One' as sentence-final particle is Singlish. Request for Cantonese support indicates multi-generational household.",
    trueIntent: "Calibrate voice model for Singlish-accented English. Add Cantonese command set for secondary user. Core problem: standard ASR fails on regional accents — VALSEA value proposition.",
  },
  fraud_security: {
    literal: "Caller claiming to be bank security, demanding immediate fund transfer and OTP.",
    cultural: "No cultural markers — scripted social engineering attack using authority impersonation and urgency tactics.",
    trueIntent: "SOCIAL ENGINEERING ATTACK. Caller is impersonating bank authority to extract OTP and initiate unauthorized fund transfer. Immediate call termination and security alert required.",
  },
  carousell_cx: {
    literal: "Buyer negotiating iPhone 15 Pro Max price down from $1,400 to $1,200, arranging same-day cash meetup at Tampines MRT.",
    cultural: "'Walao eh' and 'siao lah' express dramatic disbelief at pricing — classic Singlish haggling theatre, not genuine hostility. 'Pangseh' (Hokkien: to stand someone up) reveals real emotional pain from prior no-show sellers. 'Damn sian' signals deep fatigue with marketplace trust issues. Seller's 'I not that kind one' is a culturally significant trust pledge.",
    trueIntent: "DEAL IMMINENT. Buyer's rapid concession from $1,000 to $1,200 confirms high purchase intent despite theatrical protests. The real CX risk isn't price — it's trust. Two prior no-shows have created abandonment anxiety. Recommend: activate Carousell CarouMeet verified meetup, send both parties a confirmed location pin, and auto-escrow the payment to eliminate cancellation risk on both sides.",
  },
  coke_vn_complaint: {
    literal: "Vietnamese consumer filing a meta-complaint about a prior Coca-Cola hotline call where the agent dismissed a product defect (swollen Coke Zero can) and hung up. Threatening a TikTok review.",
    cultural: "'Cộc lốc' (curt/abrupt) describes rude agent tone. 'Trời ơi' and 'vô tri' (clueless) frame moral outrage rather than literal product anger. The caller cites lot code L23-CCVN-0842 and a child-safety angle — a classic Vietnamese pressure pattern that escalates a service failure into a brand-trust narrative. 'Anh nói thiệt' (I'm telling the truth) plus TikTok livestream mention is a soft ultimatum, not idle threat — Vietnamese consumers routinely weaponize social platforms for B2C resolution leverage.",
    trueIntent: "DUAL ESCALATION: (1) Product QA — swollen can on lot L23-CCVN-0842 may indicate fermentation/contamination in a specific batch from Bách Hoá Xanh Cầu Giấy supply chain. (2) Agent conduct — recent call from 0908-xxx-432 must be pulled for QA review. Social risk is real: caller has active TikTok audience. Resolution must combine genuine apology + lot recall investigation + a tangible gesture (case replacement + voucher) within 24h to prevent viral escalation.",
  },
  coke_vn_supplier: {
    literal: "Đà Nẵng distributor (Tâm Phát) placing a Tết bulk order: 100 cartons of Coca-Cola Original 330ml (SKU CCVN-ORG-330-24), delivery to 245 Nguyễn Văn Linh, Thanh Khê on 28 Jan 2026. PO PO-CCVN-DN-20260128-0917, tracking CCVN-TRK-7742039.",
    cultural: "Polite B2B register — 'anh/em' hierarchy maintained throughout. 'Cháy hàng' (run out of stock / burning hot demand) signals Tết-season urgency without aggression. 'Đỉnh luôn á' is positive Gen Z affirmation, not sarcasm in this context. Request for Zalo confirmation reflects standard Vietnamese B2B practice where Zalo is the de facto operational channel.",
    trueIntent: "HIGH-VALUE TẾT ORDER. Tâm Phát is a recurring Đà Nẵng distributor with downstream F&B accounts (quán ăn). Delivery slippage past 28 Jan 2026 directly costs the distributor sell-through in the most lucrative Vietnamese sales window. VALSEA auto-confirms PO, locks tracking code, and pushes Zalo confirmation — no human re-entry needed.",
  },
  multilingual_cjk: {
    literal: "Three-way regional sync (HK · Tokyo · Seoul) confirming a coordinated product launch on the 1st of next month, with Seoul shipping from Busan by the 25th and tri-lingual packaging spec sheets distributed in English.",
    cultural: "Five-language live code-switching: Cantonese (唔得啊, 咁就), English connectors, Mandarin (客户, 收到), Japanese (お疲れ様, 在庫, 大丈夫), Korean (잠시만요, 우리는, 알겠습니다). Each speaker anchors in their native register but switches into Mandarin/English as the shared bridge. Politeness markers (お疲れ様です, 알겠습니다) preserve hierarchy across borders. Hesitation around 在庫 reveals the real risk — Tokyo inventory, not timeline.",
    trueIntent: "LAUNCH UNBLOCKED. The surface conversation is about timing, but the actual blocker is Tokyo's inventory tightness, solved by Seoul agreeing to ship from Busan. VALSEA must transcribe all five languages without dropping speakers, identify Tokyo as the constraint owner, and produce a single English meeting summary with attached CN/JP/KR spec deltas — replacing what would otherwise require three interpreters and a follow-up email thread.",
  },
  multilingual_vn: {
    literal: "HCMC SME owner placing a cross-border B2B order: 50 cartons of G7 coffee, PO VN-SG-20260322-0041, shipping via Cát Lái port to Tuas (Singapore), required delivery before 30 March or downstream Singapore client will cancel.",
    cultural: "Three-language fluid code-switching: Vietnamese (alo, đỉnh luôn, trời ơi căng lắm), English connectors (no problem, ETA, priority), and Mandarin operational phrases (我可以同步, 五十, 我会 push). The 'chị/em' hierarchy is preserved throughout — caller leads, agent defers. 'Trời ơi căng lắm' (oh heavens it's so tight) reveals the actual stress is downstream-client cancellation risk, not the shipping logistics itself.",
    trueIntent: "CROSS-BORDER PRIORITY DISPATCH. Real intent isn't just booking a shipment — it's protecting the caller's Singapore client relationship. VALSEA handles all three languages in a single pass, flags 30 March as a hard deadline tied to churn risk, and triggers priority customs clearance + Zalo tracking — the channel Vietnamese SMEs actually use for operations.",
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
  legal: {
    type: "ojk_regulatory_filing",
    data: {
      case_id: "OJK-WB-20260303", allegation: "INSIDER_TRADING",
      subjects: ["Director Tan", "CFO"], evidence_type: "MEETING_RECORDING",
      whistleblower_protection: true, action: "FILE_REGULATORY_REPORT",
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
  fraud_security: {
    type: "mas_regulatory_alert",
    data: {
      alert_id: "MAS-SEC-20260307", threat_type: "SOCIAL_ENGINEERING",
      severity: "CRITICAL", synthetic_voice_prob: 0.78,
      behavioral_fraud_score: 0.92, action: "TERMINATE_AND_ALERT",
      regulatory_body: "MAS", report_to: "DBS_FRAUD_UNIT",
    },
  },
  carousell_cx: {
    type: "carousell_trust_safety_api",
    data: {
      listing_id: "CSL-SG-20260309-7821", category: "MOBILE_PHONES",
      item: "iPhone 15 Pro Max 256GB", condition: "MINT_WITH_APPLECARE",
      asking_price: 1400, negotiated_price: 1200, price_delta: "-14%",
      buyer_intent_score: 0.91, seller_rating: 4.7, buyer_prior_cancellations_received: 2,
      trust_risk: "ELEVATED", meetup_location: "Tampines MRT",
      meetup_time: "18:00 SGT", trust_flags: ["REPEAT_NO_SHOW_VICTIM", "PANGSEH_ANXIETY"],
      actions: ["ACTIVATE_CAROUMEET_VERIFIED_MEETUP", "SEND_LOCATION_PIN_BOTH_PARTIES", "ENABLE_PAYMENT_ESCROW", "TRIGGER_SELLER_CONFIRMATION_REMINDER_T_MINUS_30MIN"],
    },
  },
  coke_vn_complaint: {
    type: "coca_cola_vn_consumer_care_api",
    data: {
      case_id: "CCVN-CC-20260318-5521",
      complaint_type: "AGENT_CONDUCT + PRODUCT_DEFECT",
      product: "Coca-Cola Zero Sugar 330ml Can",
      sku: "CCVN-ZRO-330-24",
      lot_code: "L23-CCVN-0842",
      defect: "SWOLLEN_CAN_OVERPRESSURE",
      retail_channel: "Bách Hoá Xanh — Cầu Giấy, Hà Nội",
      caller_phone: "+84-908-xxx-432",
      prior_call_id: "CCVN-CALL-20260318-3309",
      agent_violation: "RUDE_TONE + UNILATERAL_HANGUP",
      social_risk: { platform: "TikTok", audience_size: "30K+", livestream_active: true },
      churn_risk: 0.71, brand_risk: "HIGH",
      slang_detected: ["cộc_lốc", "vô_tri", "trời_ơi"],
      actions: [
        "PULL_PRIOR_CALL_RECORDING_FOR_QA",
        "ESCALATE_AGENT_TO_TEAM_LEAD",
        "TRIGGER_LOT_L23-CCVN-0842_QA_INVESTIGATION",
        "DISPATCH_REPLACEMENT_CASE + 200K_VND_VOUCHER",
        "SEND_VIETNAMESE_APOLOGY_SCRIPT_VIA_ZALO",
        "MONITOR_TIKTOK_FOR_VIRAL_ESCALATION",
      ],
    },
  },
  coke_vn_supplier: {
    type: "coca_cola_vn_distributor_order_api",
    data: {
      purchase_order: "PO-CCVN-DN-20260128-0917",
      distributor: { name: "Đại lý Tâm Phát", contact: "Anh Tâm", region: "Đà Nẵng" },
      sku: "CCVN-ORG-330-24",
      product: "Coca-Cola Original Taste 330ml Can",
      quantity_cartons: 100,
      units_per_carton: 24,
      total_units: 2400,
      delivery_address: "245 Nguyễn Văn Linh, Phường Vĩnh Trung, Quận Thanh Khê, Đà Nẵng",
      delivery_date: "2026-01-28",
      delivery_window: "07:00–18:00 ICT",
      tracking_code: "CCVN-TRK-7742039",
      season: "TET_2026",
      confirmation_channel: "ZALO",
      payment_terms: "NET_30",
      sla_priority: "PRE_TET_CRITICAL",
      downstream_risk: "F&B_OUTLETS_STOCKOUT_IF_DELAYED",
      actions: [
        "CONFIRM_PO_IN_SAP",
        "RESERVE_STOCK_FROM_DA_NANG_DC",
        "DISPATCH_TRACKING_VIA_ZALO",
        "FLAG_PRE_TET_DELIVERY_PRIORITY",
        "SCHEDULE_T_MINUS_24H_REMINDER_CALL",
      ],
    },
  },
  multilingual_cjk: {
    type: "global_collaboration_workflow_api",
    data: {
      meeting_id: "GLB-HK-TKO-SEL-20260319-0014",
      participants: [
        { region: "Hong Kong", primary_language: "yue_cantonese", secondary: ["english", "zh_mandarin"] },
        { region: "Tokyo", primary_language: "ja_japanese", secondary: ["english"] },
        { region: "Seoul", primary_language: "ko_korean", secondary: ["english"] },
      ],
      languages_detected: ["yue_cantonese", "en_english", "zh_mandarin", "ja_japanese", "ko_korean"],
      code_switches_per_minute: 6.4,
      asr_confidence_per_language: { yue: 0.91, en: 0.96, zh: 0.93, ja: 0.94, ko: 0.92 },
      decisions: [
        { topic: "Launch date", outcome: "Confirmed: next month, day 1" },
        { topic: "Inventory blocker", outcome: "Seoul ships from Busan by day 25" },
        { topic: "Packaging", outcome: "Tri-lingual CN/JP/KR spec, English summary" },
      ],
      output_artifact: "ENGLISH_MEETING_SUMMARY + CN_JP_KR_SPEC_SHEETS",
      actions: [
        "GENERATE_UNIFIED_ENGLISH_SUMMARY",
        "AUTO_ATTACH_TRILINGUAL_SPEC_SHEETS",
        "NOTIFY_BUSAN_PORT_OPERATIONS",
        "FLAG_TOKYO_INVENTORY_RISK_FOR_OPS",
      ],
    },
  },
  multilingual_vn: {
    type: "cross_border_vn_b2b_order_api",
    data: {
      purchase_order: "VN-SG-20260322-0041",
      origin: { country: "Vietnam", city: "Ho Chi Minh City", port: "Cát Lái" },
      destination: { country: "Singapore", port: "Tuas" },
      product: "G7 Instant Coffee 3-in-1",
      sku: "VN-G7-3IN1-50CTN",
      quantity_cartons: 50,
      delivery_deadline: "2026-03-30",
      churn_risk_if_late: 0.81,
      languages_detected: ["vi_vietnamese", "en_english", "zh_mandarin"],
      code_switches: 7,
      cultural_flags: ["CHI_EM_HIERARCHY_MAINTAINED", "DOWNSTREAM_CLIENT_CANCELLATION_RISK"],
      confirmation_channel: "ZALO",
      actions: [
        "BOOK_CAT_LAI_TO_TUAS_SHIPMENT",
        "ESCALATE_CUSTOMS_PRIORITY_CLEARANCE",
        "DISPATCH_TRACKING_VIA_ZALO",
        "MONITOR_DEADLINE_T_MINUS_72H",
      ],
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
  const [scenarioDropdownOpen, setScenarioDropdownOpen] = useState(false);
  const scenarioDropdownRef = useRef<HTMLDivElement>(null);
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
      showToast("Live analysis completed successfully.", "success");
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
              showToast("Audio analysis completed successfully.", "success");
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

  // Close scenario dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (scenarioDropdownRef.current && !scenarioDropdownRef.current.contains(e.target as Node)) {
        setScenarioDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          showToast("Analysis completed successfully.", "success");
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

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bar-track)] hover:bg-[var(--accent-glow)] transition-colors"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4 text-[var(--muted-light)]" /> : <Sun className="w-4 h-4 text-[var(--warning)]" />}
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

      {/* ── Vertical Selector + Run Demo Bar ──────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-2">
        <div className="flex flex-col gap-3">
          {/* Vertical pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" ref={scenarioDropdownRef}>
            <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-[var(--muted)] whitespace-nowrap mr-1">Vertical</span>
            {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveScenario(key)}
                className={`relative whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  activeScenario === key
                    ? "text-white border-transparent shadow-lg shadow-[var(--accent)]/20"
                    : "text-[var(--muted-light)] border-[var(--border-subtle)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)] hover:bg-[var(--bar-track)]"
                }`}
                style={activeScenario === key ? { background: "var(--brand-gradient)" } : {}}
              >
                {activeScenario === key && (
                  <motion.span
                    layoutId="activeVertical"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--brand-gradient)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{SCENARIOS[key].label}</span>
              </button>
            ))}
          </div>

          {/* Scenario info + Run Demo CTA */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <Radio className="w-3 h-3 text-[var(--accent-light)]" />
                <span className="font-medium text-[var(--foreground)]">{config.scenario}</span>
                <span className="text-[var(--muted-light)]">·</span>
                <span>{config.source} → {config.target}</span>
              </div>
              {demoPhase !== "idle" && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full ${demoPhase === "streaming" ? "bg-[var(--warning)] pulse-dot" : "bg-[var(--success)]"}`} />
                  <span className={demoPhase === "streaming" ? "text-[var(--warning)]" : "text-[var(--success)]"}>
                    {demoPhase === "streaming" ? "ANALYZING..." : "COMPLETE"}
                  </span>
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={isRunning ? resetDemo : runDemo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg shrink-0"
              style={{
                background: isRunning ? "var(--danger)" : "var(--brand-gradient)",
                boxShadow: isRunning
                  ? "0 4px 20px -4px rgba(239,68,68,0.4)"
                  : "0 4px 20px -4px var(--accent)",
              }}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" /> STOP
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> RUN DEMO
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Dashboard Grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pb-4 sm:pb-6">
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
