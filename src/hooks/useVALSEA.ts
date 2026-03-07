import { useState, useCallback } from "react";
import {
  VALSEAClient,
  VALSEAAnalysisResult,
  VALSEAError,
  isVALSEAError,
  createVALSEAClient,
} from "@/lib/valsea-api";

export interface UseVALSEAOptions {
  baseUrl?: string;
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (result: VALSEAAnalysisResult) => void;
  onError?: (error: VALSEAError | Error) => void;
}

export interface UseVALSEAReturn {
  // State
  isAnalyzing: boolean;
  result: VALSEAAnalysisResult | null;
  error: VALSEAError | Error | null;
  
  // Actions
  analyzeText: (dialog: string) => Promise<VALSEAAnalysisResult | null>;
  analyzeAudio: (file: File) => Promise<VALSEAAnalysisResult | null>;
  reset: () => void;
  
  // Computed
  hasResult: boolean;
  hasError: boolean;
  emotionScores: VALSEAAnalysisResult["emotions"] | null;
  securityAnalysis: VALSEAAnalysisResult["security"] | null;
  cognitiveInsights: VALSEAAnalysisResult["cognitive"] | null;
}

export function useVALSEA(options: UseVALSEAOptions = {}): UseVALSEAReturn {
  const { baseUrl, onAnalysisStart, onAnalysisComplete, onError } = options;
  
  const [client] = useState<VALSEAClient>(() => createVALSEAClient(baseUrl));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VALSEAAnalysisResult | null>(null);
  const [error, setError] = useState<VALSEAError | Error | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  const analyzeText = useCallback(async (dialog: string): Promise<VALSEAAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    onAnalysisStart?.();

    try {
      const response = await client.analyzeText(dialog);
      
      if (isVALSEAError(response)) {
        setError(response);
        onError?.(response);
        return null;
      }
      
      setResult(response);
      onAnalysisComplete?.(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [client, onAnalysisStart, onAnalysisComplete, onError]);

  const analyzeAudio = useCallback(async (file: File): Promise<VALSEAAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    onAnalysisStart?.();

    try {
      const response = await client.analyzeAudio(file);
      
      if (isVALSEAError(response)) {
        setError(response);
        onError?.(response);
        return null;
      }
      
      setResult(response);
      onAnalysisComplete?.(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [client, onAnalysisStart, onAnalysisComplete, onError]);

  return {
    isAnalyzing,
    result,
    error,
    analyzeText,
    analyzeAudio,
    reset,
    hasResult: result !== null,
    hasError: error !== null,
    emotionScores: result?.emotions ?? null,
    securityAnalysis: result?.security ?? null,
    cognitiveInsights: result?.cognitive ?? null,
  };
}
