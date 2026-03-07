import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import speech from "@google-cloud/speech";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize Google Cloud Speech Client (Chirp/Acoustic Layer)
const speechClient = new speech.SpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const SYSTEM_PROMPT = `You are VALSEA, a Voice-to-Action Logistics & Sentiment Engine.
You analyze conversation transcripts to extract structured intelligence.

Given a conversation dialog, you MUST return a valid JSON object with this EXACT structure (no markdown, no code fences, just raw JSON):

{
  "emotions": {
    "frustration": <number 0-1>,
    "anxiety": <number 0-1>,
    "politeness": <number 0-1>,
    "confidence": <number 0-1>
  },
  "security": {
    "deepfakeProb": <number 0-1>,
    "threatFlag": <boolean>,
    "riskLevel": "<low|medium|high>"
  },
  "cognitive": {
    "status": "<Resolved|Pending|Escalated>",
    "intent": "<brief intent description>",
    "translation": "<normalized professional English translation of the conversation meaning>",
    "cultural_context": "<explanation of any cultural/linguistic nuances like Singlish, slang, code-switching>",
    "fraud_verdict": "<LOW RISK / MEDIUM RISK / HIGH RISK — brief explanation>",
    "action_advised": "<recommended next steps for the business>"
  },
  "summary": "<1-2 sentence executive summary of the conversation>"
}

Analysis guidelines:
- Detect Asian-English dialects (Singlish, Manglish, etc.) and decode cultural slang (lah, leh, walao, blur like sotong, buay tahan, kan cheong, etc.)
- Analyze emotional prosody from word patterns — urgency markers, frustration indicators, politeness levels
- Assess fraud/social engineering risk based on pressure tactics, urgency manipulation, authority impersonation
- Provide a clear, professional English translation of what the speaker actually means
- Be precise with emotion scores. Use the full 0-1 range based on actual evidence in the text.`;

export async function POST(req: Request) {
    try {
        let dialogText = "";
        let valseaSemanticTags = null;
        let transcript = null;

        const contentType = req.headers.get("content-type") || "";

        // ==========================================
        // 1. ACOUSTIC LAYER: Google Cloud Speech (Chirp)
        // ==========================================
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            if (!file) {
                return NextResponse.json({ error: "No file provided" }, { status: 400 });
            }

            console.log("[Analyze API] Processing audio via Google Cloud Speech-to-Text (Chirp)...");

            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioBytes = Buffer.from(arrayBuffer).toString("base64");

                // Use latest_long model which points to Google's Chirp/Conformer layer in v1
                const requestObj = {
                    audio: { content: audioBytes },
                    config: {
                        model: "latest_long",
                        languageCode: "en-SG", // Targeting Singapore/Asian-English
                        alternativeLanguageCodes: ["cmn-SG", "ms-MY"], // Code-switching support
                    },
                };

                const [response] = await speechClient.recognize(requestObj);

                if (response.results && response.results.length > 0) {
                    dialogText = response.results
                        .map((res: any) => res.alternatives[0].transcript)
                        .join("\n");
                    console.log("[Analyze API] Google Cloud STT Transcribed:", dialogText);
                } else {
                    return NextResponse.json({ error: "No speech recognized by Google Cloud." }, { status: 400 });
                }
            } catch (err) {
                console.error("[Analyze API] Google Cloud Speech Error:", err);
                return NextResponse.json({ error: "Google Cloud STT Failed", details: String(err) }, { status: 500 });
            }

            transcript = [{ role: "user", text: dialogText }];

            // Now that we have transcript, pass it to Valsea Annotate to act as the Prosody/Security logic layer
            console.log("[Analyze API] Sending transcribed text to VALSEA Annotate (Prosody/Security)...");
            try {
                const annotateRes = await fetch("https://api.valsea.asia/annotate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: dialogText })
                });
                if (annotateRes.ok) {
                    const annotateData = await annotateRes.json();
                    valseaSemanticTags = annotateData.semantic_tags || null;
                    console.log("[Analyze API] VALSEA Annotate response received");
                }
            } catch (annotateErr) {
                console.error("[Analyze API] Failed to call Valsea text annotate endpoint.", annotateErr);
            }

        } else {
            // ==========================================
            // TEXT ONLY FALLBACK (TESTING)
            // ==========================================
            const body = await req.json();
            dialogText = body.dialog;

            if (!dialogText || typeof dialogText !== "string" || dialogText.trim().length === 0) {
                return NextResponse.json({ error: "Missing or empty 'dialog' field" }, { status: 400 });
            }

            console.log("[Analyze API] Sending text to VALSEA Annotate...");
            try {
                const annotateRes = await fetch("https://api.valsea.asia/annotate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: dialogText })
                });
                if (annotateRes.ok) {
                    const annotateData = await annotateRes.json();
                    valseaSemanticTags = annotateData.semantic_tags || null;
                    console.log("[Analyze API] VALSEA Annotate response received");
                }
            } catch (annotateErr) {
                console.error("[Analyze API] Failed to call Valsea text annotate endpoint.", annotateErr);
            }
        }

        console.log("[Analyze API] Processing dialog length:", dialogText.length);

        let promptContent = `Here is the conversation to analyze:\n\n${dialogText}`;
        if (valseaSemanticTags && Array.isArray(valseaSemanticTags)) {
            promptContent += `\n\nVALSEA AI Semantic Tags to consider (incorporate these into Emotion scores and Fraud verdicts):\n${JSON.stringify(valseaSemanticTags)}`;
        }

        // ==========================================
        // 5. COGNITIVE HUB: Gemini 3 Flash Layer
        // ==========================================
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: promptContent },
        ]);

        const response = result.response;
        const text = response.text();

        console.log("[Analyze API] Raw Gemini response:", text.substring(0, 200));

        // ── Parse JSON from Gemini response ───────────────────────────────
        let jsonStr = text.trim();
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
        }

        let analysis;
        try {
            analysis = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("[Analyze API] Failed to parse Gemini JSON:", parseError);
            console.error("[Analyze API] Raw text was:", text);
            return NextResponse.json(
                { error: "Failed to parse AI response", raw: text },
                { status: 500 }
            );
        }

        // ── Validate and ensure all fields exist ──────────────────────────
        const validated = {
            transcript: transcript || undefined,
            emotions: {
                frustration: Number(analysis.emotions?.frustration ?? 0),
                anxiety: Number(analysis.emotions?.anxiety ?? 0),
                politeness: Number(analysis.emotions?.politeness ?? 0),
                confidence: Number(analysis.emotions?.confidence ?? 0.5),
            },
            security: {
                deepfakeProb: Number(analysis.security?.deepfakeProb ?? 0),
                threatFlag: Boolean(analysis.security?.threatFlag),
                riskLevel: analysis.security?.riskLevel || "low",
            },
            cognitive: {
                status: analysis.cognitive?.status || "Pending",
                intent: analysis.cognitive?.intent || "Unknown",
                translation: analysis.cognitive?.translation || "No translation available",
                cultural_context: analysis.cognitive?.cultural_context || "No cultural context detected",
                fraud_verdict: analysis.cognitive?.fraud_verdict || "LOW RISK — No indicators found",
                action_advised: analysis.cognitive?.action_advised || "No specific action recommended",
            },
            summary: analysis.summary || "Analysis complete.",
        };

        console.log("[Analyze API] Analysis complete:", validated.summary);

        return NextResponse.json(validated, { status: 200 });
    } catch (error) {
        console.error("[Analyze API] Error:", error);
        return NextResponse.json(
            { error: "Analysis failed", details: String(error) },
            { status: 500 }
        );
    }
}
