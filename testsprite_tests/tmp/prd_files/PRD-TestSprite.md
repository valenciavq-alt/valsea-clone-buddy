# Full PRD for TestSprite Testing

**Project:** VALSEA / Sentinel Voice (Voice-to-Action Logistics & Sentiment Engine)  
**Purpose:** Structured PRD for TestSprite test plan generation and execution  
**Document type:** TestSprite-compatible Product Requirements Document

---

## 1. Executive Summary

**Tagline:** Bridging the chasm between what is said, how it's felt, and what is meant.

**Objective:** A real-time, multimodal orchestration layer that decodes Asian-accented speech (Singlish, regional dialects), emotional prosody, and behavioral fraud markers into structured enterprise data.

**Target users:** Call center agents, corporate front desk staff, and (future) vulnerable users (e.g., elderly) via an "AI Phone Bouncer" style app.

**In scope for testing:**
- **Frontend:** Split-screen React dashboard (live transcript, waveform, emotion/security dials, structured output, alerts).
- **Backend (if exposed):** Pipeline behavior, webhooks, and API contracts where testable via UI or fixtures.

---

## 2. Test Scope

| Scope        | Description |
|-------------|-------------|
| **Type**    | Frontend (primary); Backend where UI or API is available |
| **Entry**   | Web app root (e.g. `/` or configured pathname) |
| **Login**   | Include login in test plan if the app requires authentication |
| **Personas**| Call center agent viewing dashboard; optional “caller” simulation via UI |

---

## 3. Architecture (Reference for Test Context)

**Platform framing:** VALSEA is presented as Speech Intelligence Infrastructure—capability layers, not vendor names. Models sit at the bottom; platform capability at the top.

| Capability Layer              | Role |
|------------------------------|------|
| Enterprise Applications      | CRM, TMS, Contact Center, Banking, Sales |
| VALSEA Decision Engine       | Intent Realignment, Workflow Automation, Cultural Context, Fraud Intervention |
| VALSEA Speech Intelligence   | Accent Understanding, Emotional Prosody, Behavioral Fraud Analysis, Cross-Cultural Intent |
| Multimodal Signal Engine     | Speech Transcription, Prosodic Analysis, Voice Security Scanning |
| Model Infrastructure        | ASR, Emotion Models, Fraud Models (implementation detail) |

**UI labels (use capability names, not vendors):** Emotion Intelligence | Security Intelligence | Intent Engine | Workflow Action. The dashboard is split-screen: transcript + Brain (dials, structured output, Whisper/advice).

---

## 4. Functional Requirements (Testable)

### 4.1 Audio & Transcription (Chirp)

- **FR-1.1** The UI displays a live transcript of the current speaker (Chirp output).
- **FR-1.2** The transcript updates in near real-time as speech is processed.
- **FR-1.3** Raw transcript is visible (e.g., left side of split-screen) so agents see exactly what was heard.

**Acceptance:** Transcript area exists, is readable, and updates when audio/stream is active.

### 4.2 Audio Visualization

- **FR-2.1** A live audio waveform (or equivalent visualization) is shown for the current stream.
- **FR-2.2** Waveform reflects activity when audio is present.

**Acceptance:** Waveform/visualization is visible and reacts to audio input.

### 4.3 Emotion Intelligence (Prosody)

- **FR-3.1** The UI shows live “Emotion” or prosody indicators (e.g., dials or scores).
- **FR-3.2** At least one of the following is visible: frustration, hesitation, confusion, satisfaction, or similar.
- **FR-3.3** Values update during the call to reflect current emotional state.

**Acceptance:** Emotion Intelligence section exists and updates when prosody data is available.

### 4.4 Security Intelligence (Fraud / Deepfake)

- **FR-4.1** The UI shows a “Security Risk” or “Fraud” indicator (e.g., dial or score 0–1).
- **FR-4.2** When deepfake/fraud probability is high (e.g., &gt; 0.90), the UI reflects “high risk” (e.g., color change or label).
- **FR-4.3** No requirement to expose raw API; only that the dashboard reflects risk level.

**Acceptance:** Security Intelligence section exists and shows elevated state when risk is high.

### 4.5 Intent Engine & Workflow Action (Structured Output & “Whisper” )

- **FR-5.1** The UI displays structured output from the Intent Engine (e.g., JSON or key-value summary).
- **FR-5.2** “Whisper” or operator advice is visible (e.g., right side “Brain” panel).
- **FR-5.3** Content updates when the Decision Engine produces new intent/advice.

**Acceptance:** Intent Engine output and Workflow Action / Whisper areas are present and update with pipeline output.

### 4.6 Alerts & Triage

- **FR-6.1** For high fraud risk or “Government Impersonation”–style intents, the UI shows a clear, high-priority alert (e.g., warning banner or modal).
- **FR-6.2** Alert text or pattern includes a scam/fraud warning (e.g., “HIGH RISK”, “SCAM DETECTED”, “Do not provide personal details”).
- **FR-6.3** For legitimate complaints, the UI shows normalized summary and/or suggested actions (no scam alert).

**Acceptance:** Alert state is visible and distinct from normal state; scam wording appears when applicable.

### 4.7 Honeypot Mode (Optional for MVP)

- **FR-7.1** When deepfake probability exceeds a threshold (e.g., 0.90), the system may enter a “Honeypot” or defensive mode.
- **FR-7.2** If implemented in UI, a clear indicator (e.g., “Honeypot active” or “Shielded”) is shown.

**Acceptance:** If Honeypot is in scope for the build, the corresponding UI state is testable.

---

## 5. User Flows (Test Scenarios)

### Flow 1: Legitimate Singlish Complaint (Complaint Normalizer)

1. User (tester) opens the dashboard (and logs in if required).
2. Audio or simulated transcript represents a frustrated Singlish complaint (e.g., “walao sibei jialat, wait so long already, what time coming?!”).
3. **Verify:** Transcript area shows content (raw or normalized).
4. **Verify:** Emotion/prosody shows elevated frustration or similar.
5. **Verify:** Structured output shows intent (e.g., “prolonged wait”, “demanding ETA”) and possibly suggested actions.
6. **Verify:** No scam/fraud alert is shown (or risk remains low).

### Flow 2: Coercive / Government Impersonation (Fraudster)

1. User opens the dashboard (and logs in if required).
2. Audio or simulated transcript represents a government-impersonation script (e.g., “Hello, this is the Police, your bank account is frozen…”).
3. **Verify:** Security/fraud indicator shows high risk (e.g., dial &gt; 0.8 or “High risk”).
4. **Verify:** A prominent scam/fraud alert appears (e.g., “SCAM DETECTED”, “Government Impersonation”, “Do not provide personal details”).
5. **Verify:** UI state is clearly different from Flow 1 (e.g., red/warning state).

### Flow 3: Cross-Border Logistics (“Buay Tahan”)

1. User opens the dashboard.
2. Input represents Singlish/Hokkien mixed with English (e.g., “deadline very tight leh, this Friday delivery buay tahan lah”).
3. **Verify:** Transcript is visible and (if normalized) shows intent related to delivery stress.
4. **Verify:** Structured output includes logistics-related intent (e.g., “High Priority”, “Delivery Re-route”, or TMS-style entry).
5. **Verify:** “Whisper” or operator advice is visible (e.g., suggest offering Monday delivery).

### Flow 4: Grab CX (“Blur Like Sotong”)

1. User opens the dashboard.
2. Input represents a frustrated passenger (e.g., “driver blur like sotong, he say he arrived but where got?”).
3. **Verify:** Emotion shows high frustration.
4. **Verify:** Intent maps to driver/arrival issue; possible outcomes: human handoff suggestion or voucher logic (if implemented in UI).
5. **Verify:** No fraud alert (legitimate complaint).

### Flow 5: Deepfake / Honeypot (If Implemented)

1. User opens the dashboard.
2. Simulated or real input triggers Modulate deepfake score &gt; 0.90.
3. **Verify:** Security dial shows high synthetic/deepfake probability.
4. **Verify:** If Honeypot is in scope, UI shows “Honeypot active” or similar and does not expose real user to attacker.

---

## 6. UI Elements Checklist (TestSprite / Manual)

- [ ] **Layout:** Split-screen or distinct “transcript” vs “Brain” areas.
- [ ] **Left (or transcript) panel:** Raw/live transcript, waveform (or equivalent).
- [ ] **Right (or Brain) panel:** Emotion Intelligence dial(s), Security Intelligence dial, Intent Engine structured output, Workflow Action / Whisper/advice (capability labels, not vendor names).
- [ ] **Alert area:** Dedicated region for high-risk/scam alerts; visually distinct (e.g., red, icon).
- [ ] **Navigation:** Entry route (e.g., `/`) loads the main dashboard; no broken links for primary flows.
- [ ] **Responsiveness:** Core layout and key elements usable at target viewport (e.g., 1280×720 or 1920×1080).
- [ ] **Loading / empty state:** Graceful behavior when no call or no data (no hard crashes).

---

## 7. Non-Functional (Test-Relevant)

- **Latency:** Target &lt;500ms for control plane; UI should feel responsive (no multi-second freeze for core updates).
- **Availability:** Dashboard loads and remains usable under normal demo conditions (no requirement for load testing unless specified).
- **Accessibility:** Key labels and alerts are readable (contrast, font size); optional: basic keyboard/screen-reader checks.

---

## 8. Out of Scope for This PRD

- Full telephony/Vapi integration testing (unless exposed via UI or test harness).
- Third-party API contract testing (Chirp, Modulate, Gemini) in isolation—only behavior visible in the app.
- Performance/load testing unless explicitly added later.
- Mobile-specific builds (unless the app is mobile-first).

---

## 9. TestSprite Usage Notes

- **Bootstrap:** Run TestSprite bootstrap with:
  - **type:** `frontend`
  - **projectPath:** `/Users/valencia/HackathonMarch9-1`
  - **localPort:** port where the app runs (e.g. `5173` for Vite, `3000` for Next/CRA)
  - **pathname:** e.g. `""` or `"/dashboard"` as applicable
  - **testScope:** `codebase` or `diff` as needed
- **PRD source:** This document (`PRD-TestSprite.md`) can be used as the single source of testable requirements when generating test plans.
- **Generate test plan:** Use TestSprite “generate frontend test plan” with `projectPath` and `needLogin` (true if app has auth).
- **Run tests:** After the app is running (e.g. `npm run build && npm run preview` or `npm run dev`), use “generate code and execute” with the same `projectPath`, `projectName`, and optional `testIds` and `serverMode` (`production` or `development`).

---

## 10. Document History

| Version | Date       | Change                    |
|--------|------------|---------------------------|
| 1.0    | 2025-03-07 | Initial TestSprite PRD    |

---

*This PRD consolidates FullPRD (VALSEA) and Planning (Sentinel Voice) into a single, testable specification for TestSprite.*
