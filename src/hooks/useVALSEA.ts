// Re-export from context for backward compatibility
export { useVALSEA } from "@/context/VALSEAContext";
export type { VALSEAAnalysisResult, VALSEAError, VALSEAClient } from "@/lib/valsea-api";
export { isVALSEAError, createVALSEAClient } from "@/lib/valsea-api";
