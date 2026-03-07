# Connecting Lovable Frontend to VALSEA Backend

This guide explains how to connect your Lovable frontend at `https://preview--valsea-clone-buddy.lovable.app` to the VALSEA backend.

## Step 1: Deploy or Expose the Backend

The VALSEA backend needs to be accessible from the internet. Options:

### Option A: Deploy to Vercel (Recommended)
```bash
# From the HackathonMarch9-1 directory
npx vercel --prod
```

### Option B: Use ngrok for local development
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

## Step 2: Add the API Client to Your Lovable Frontend

Copy this code to your Lovable project:

### `lib/valsea-api.ts`

```typescript
// VALSEA API Client for Lovable Frontend
const VALSEA_API_URL = "YOUR_BACKEND_URL"; // e.g., "https://your-app.vercel.app" or ngrok URL

export interface VALSEAAnalysisResult {
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
    status: "Resolved" | "Pending" | "Escalated";
    intent: string;
    translation: string;
    cultural_context: string;
    fraud_verdict: string;
    action_advised: string;
  };
  summary: string;
  transcript?: Array<{ role: string; text: string }>;
}

export async function analyzeConversation(dialog: string): Promise<VALSEAAnalysisResult> {
  const response = await fetch(`${VALSEA_API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dialog }),
  });
  
  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function analyzeAudioFile(file: File): Promise<VALSEAAnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(`${VALSEA_API_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

## Step 3: Connect UI Triggers to API Calls

### Text Analysis Button

```tsx
import { useState } from "react";
import { analyzeConversation, VALSEAAnalysisResult } from "@/lib/valsea-api";

function AnalyzeButton({ conversationText }: { conversationText: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VALSEAAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!conversationText.trim()) {
      setError("Please enter a conversation to analyze");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const analysis = await analyzeConversation(conversationText);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleAnalyze} disabled={isLoading}>
      {isLoading ? "Analyzing..." : "Analyze Conversation"}
    </button>
  );
}
```

### Audio File Upload

```tsx
import { useState, useRef } from "react";
import { analyzeAudioFile, VALSEAAnalysisResult } from "@/lib/valsea-api";

function AudioUploader() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VALSEAAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const analysis = await analyzeAudioFile(file);
      setResult(analysis);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        hidden
      />
      <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
        {isLoading ? "Processing..." : "Upload Audio"}
      </button>
    </div>
  );
}
```

### Display Analysis Results

```tsx
function AnalysisResults({ result }: { result: VALSEAAnalysisResult }) {
  return (
    <div className="analysis-results">
      {/* Summary */}
      <div className="summary-card">
        <h3>Summary</h3>
        <p>{result.summary}</p>
      </div>

      {/* Emotion Gauges */}
      <div className="emotions-panel">
        <h3>Emotion Intelligence</h3>
        <EmotionGauge label="Frustration" value={result.emotions.frustration} />
        <EmotionGauge label="Anxiety" value={result.emotions.anxiety} />
        <EmotionGauge label="Politeness" value={result.emotions.politeness} />
        <EmotionGauge label="Confidence" value={result.emotions.confidence} />
      </div>

      {/* Security Analysis */}
      <div className={`security-card risk-${result.security.riskLevel}`}>
        <h3>Security Intelligence</h3>
        <div>Deepfake Probability: {(result.security.deepfakeProb * 100).toFixed(1)}%</div>
        <div>Risk Level: {result.security.riskLevel.toUpperCase()}</div>
        {result.security.threatFlag && (
          <div className="threat-alert">⚠️ Threat Detected</div>
        )}
      </div>

      {/* Cognitive Insights */}
      <div className="cognitive-panel">
        <h3>Intent Engine</h3>
        <div><strong>Status:</strong> {result.cognitive.status}</div>
        <div><strong>Intent:</strong> {result.cognitive.intent}</div>
        <div><strong>Translation:</strong> {result.cognitive.translation}</div>
        <div><strong>Cultural Context:</strong> {result.cognitive.cultural_context}</div>
        <div><strong>Fraud Verdict:</strong> {result.cognitive.fraud_verdict}</div>
        <div><strong>Action Advised:</strong> {result.cognitive.action_advised}</div>
      </div>
    </div>
  );
}

function EmotionGauge({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="emotion-gauge">
      <span>{label}</span>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${percentage}%` }} />
      </div>
      <span>{percentage}%</span>
    </div>
  );
}
```

## Step 4: Environment Variables

In your Lovable project settings, add:

```
VITE_VALSEA_API_URL=https://your-backend-url.vercel.app
```

Then update the API client:

```typescript
const VALSEA_API_URL = import.meta.env.VITE_VALSEA_API_URL || "http://localhost:3000";
```

## API Reference

### POST /api/analyze

Analyze a conversation for emotions, security threats, and cognitive insights.

**Request (Text):**
```json
{
  "dialog": "Agent: Hello, how can I help?\nCustomer: My package hasn't arrived lah!"
}
```

**Request (Audio):**
- Content-Type: `multipart/form-data`
- Body: `file` (audio file)

**Response:**
```json
{
  "emotions": {
    "frustration": 0.3,
    "anxiety": 0.2,
    "politeness": 0.7,
    "confidence": 0.5
  },
  "security": {
    "deepfakeProb": 0.05,
    "threatFlag": false,
    "riskLevel": "low"
  },
  "cognitive": {
    "status": "Pending",
    "intent": "Package delivery inquiry",
    "translation": "Customer is asking about delayed package delivery",
    "cultural_context": "Contains Singlish expression 'lah'",
    "fraud_verdict": "LOW RISK — No fraud indicators",
    "action_advised": "Check delivery status and provide update"
  },
  "summary": "Customer inquiry about delayed package delivery."
}
```

### POST /api/webhook/vapi

Handle Vapi real-time call webhooks.

**Request:**
```json
{
  "message": {
    "type": "transcript",
    "transcript": "Hello, I need help with my order"
  }
}
```

**Response:**
```json
{
  "success": true,
  "received": true
}
```
