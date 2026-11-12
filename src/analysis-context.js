import { createContext, useContext } from "react";

// The analysis in progress (provider: src/analysis-job.jsx).
export const AnalysisContext = createContext(null);

export function useAnalysis() {
  return useContext(AnalysisContext);
}
