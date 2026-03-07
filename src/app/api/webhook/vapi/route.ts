import { NextResponse } from "next/server";

// CORS preflight handler
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        },
    });
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Vapi webhook payload usually contains a message object
        const message = payload.message;
        if (!message) {
            return NextResponse.json({ error: "No message found in payload" }, { status: 400 });
        }

        console.log(`[VAPI Webhook] Received message type: ${message.type}`);

        // Handle different types of messages from Vapi
        switch (message.type) {
            case "function-call":
                // This is where Gemini 3 Flash / Cognitive Hub logic comes into play.
                // If Vapi attempts to trigger a function (e.g., 'escalate_to_human' or 'clarify_intent'),
                // we process it here.
                break;
            case "transcript":
                // Raw transcript from Google Chirp.
                // We can fork this to Hume/Modulate if running text-based or trigger an update to the UI.
                break;
            case "end-of-call-report":
                console.log("Call ended. Generating final insights.");
                break;
            default:
                console.log(`Unhandled message type: ${message.type}`);
        }

        // Acknowledge the webhook
        return NextResponse.json({ success: true, received: true }, { status: 200 });
    } catch (error) {
        console.error("[VAPI Webhook] Error parsing webhook:", error);
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
}
