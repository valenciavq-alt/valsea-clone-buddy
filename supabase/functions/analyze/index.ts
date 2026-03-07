import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dialog } = await req.json();
    if (!dialog || typeof dialog !== "string" || !dialog.trim()) {
      return new Response(JSON.stringify({ error: "Missing 'dialog' field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are VALSEA — Voice-to-Action Logistics & Sentiment Engine. You analyze conversations for emotions, security threats, cultural context, and intent.

Given a conversation transcript, return a JSON analysis by calling the provided tool. Analyze the text for:
1. Emotional prosody: frustration, anxiety, politeness, confidence (0-1 scale)
2. Security: deepfake probability (0-1), threat flag (boolean), risk level (low/medium/high)
3. Cognitive synthesis: status, intent, translation, cultural context (especially Singlish/Asian expressions), fraud verdict, action advised
4. A brief summary

Be precise with cultural context — detect Singlish markers (lah, leh, walao, buay tahan, kan cheong, etc.) and regional expressions. Flag social engineering patterns and urgency manipulation tactics.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze this conversation:\n\n${dialog}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "valsea_analysis",
                description:
                  "Return structured VALSEA analysis of a conversation",
                parameters: {
                  type: "object",
                  properties: {
                    summary: {
                      type: "string",
                      description: "Brief summary of the conversation",
                    },
                    emotions: {
                      type: "object",
                      properties: {
                        frustration: { type: "number" },
                        anxiety: { type: "number" },
                        politeness: { type: "number" },
                        confidence: { type: "number" },
                      },
                      required: [
                        "frustration",
                        "anxiety",
                        "politeness",
                        "confidence",
                      ],
                      additionalProperties: false,
                    },
                    security: {
                      type: "object",
                      properties: {
                        deepfakeProb: { type: "number" },
                        threatFlag: { type: "boolean" },
                        riskLevel: {
                          type: "string",
                          enum: ["low", "medium", "high"],
                        },
                      },
                      required: ["deepfakeProb", "threatFlag", "riskLevel"],
                      additionalProperties: false,
                    },
                    cognitive: {
                      type: "object",
                      properties: {
                        status: {
                          type: "string",
                          enum: ["Resolved", "Pending", "Escalated"],
                        },
                        intent: { type: "string" },
                        translation: { type: "string" },
                        cultural_context: { type: "string" },
                        fraud_verdict: { type: "string" },
                        action_advised: { type: "string" },
                      },
                      required: [
                        "status",
                        "intent",
                        "translation",
                        "cultural_context",
                        "fraud_verdict",
                        "action_advised",
                      ],
                      additionalProperties: false,
                    },
                  },
                  required: ["summary", "emotions", "security", "cognitive"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "valsea_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
