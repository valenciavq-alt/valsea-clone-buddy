"use client";

import { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import { PhoneOff, PhoneCall } from "lucide-react";
import { useVALSEA } from "@/context/VALSEAContext";

export default function VapiCallButton() {
    const [callStatus, setCallStatus] = useState<"inactive" | "loading" | "active">("inactive");
    const [vapi, setVapi] = useState<Vapi | null>(null);
    const { updateTranscript, updateEmotions, updateSecurity, updateCognitive, setIsCalling, resetState } = useVALSEA();

    useEffect(() => {
        // Initialize Vapi with the public key from env
        const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "dummy-key");
        setVapi(vapiInstance);

        vapiInstance.on("call-start", () => {
            setCallStatus("active");
            setIsCalling(true);
        });

        vapiInstance.on("call-end", () => {
            setCallStatus("inactive");
            setIsCalling(false);
        });

        vapiInstance.on("speech-update", (update) => {
            if (update.type === "transcript" && update.status === "final") {
                updateTranscript(update.role, update.transcript);
            }
        });

        vapiInstance.on("message", (message) => {
            console.log("[Vapi Message]", message);
            // Handle custom data from webhooks/functions
            if (message.type === "transcript" && message.transcriptType === "final") {
                updateTranscript(message.role === "user" ? "user" : "assistant", message.transcript);
            }

            if (message.type === "function-call-result") {
                // Example of structured data returning from a tool
                try {
                    const result = JSON.parse(message.result);
                    if (result.type === "valsea-analysis") {
                        updateEmotions(result.emotions);
                        updateSecurity(result.security);
                        updateCognitive(result.cognitive);
                    }
                } catch (e) {
                    console.error("Failed to parse function call result", e);
                }
            }
        });

        vapiInstance.on("error", (error: Error) => {
            console.error("Vapi Error:", error);
            setCallStatus("inactive");
            setIsCalling(false);
        });

        return () => {
            vapiInstance.removeAllListeners();
        };
    }, []);

    const toggleCall = async () => {
        if (!vapi) return;

        if (callStatus === "active") {
            vapi.stop();
        } else {
            setCallStatus("loading");
            resetState();

            // Start the call with Project VALSEA's intended configuration:
            // Google Chirp for ASR + Gemini 3 Flash as the cognitive hub.
            vapi.start({
                transcriber: {
                    provider: "google",
                    model: "telephony",
                    language: "en-US", // Fallback
                },
                model: {
                    provider: "google",
                    model: "gemini-1.5-flash", // Represents Gemini 3 Flash
                    messages: [
                        {
                            role: "system",
                            content: `You are the VALSEA Intent Normalizer. 
                            Your goal is to ensure 100% mutual understanding between a customer with an Asian-accented English dialect and the business system. 
                            Focus on Intent rather than just literal ASR text.
                            
                            When you detect specific cultural nuances or emotional distress, you should trigger the 'analyze_interaction' tool with the context.`,
                        },
                    ],
                },
                firstMessage: "Hello, this is Sentinel Voice. I am ready to assist you.",
            } as any);
        }
    };

    return (
        <button
            onClick={toggleCall}
            disabled={callStatus === "loading"}
            className={`px-6 py-3 rounded-full flex items-center shadow-lg space-x-2 font-semibold transition-all transform hover:scale-105 active:scale-95 ${callStatus === "active"
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30"
                }`}
        >
            {callStatus === "active" ? (
                <>
                    <PhoneOff className="w-5 h-5" />
                    <span>Intercepting Audio...</span>
                </>
            ) : callStatus === "loading" ? (
                <>
                    <span className="animate-pulse">Booting Sentinel Voice...</span>
                </>
            ) : (
                <>
                    <PhoneCall className="w-5 h-5" />
                    <span>Launch VALSEA Demo</span>
                </>
            )}
        </button>
    );
}
