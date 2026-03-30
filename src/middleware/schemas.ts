import { z } from "zod";

export const baseScoreSchema = z.object({
  interviewScore: z.number().min(0).max(10),
  familyTreeScore: z.number().min(0).max(10),
  assessmentScore: z.number().min(0).max(10),
  profileQualityScore: z.number().min(0).max(10),
  spotlightPerformanceScore: z.number().min(0),
});

export const singleScoreSchema = z.object({
  score: z.number().min(0).max(10),
});

// Inferred TypeScript types — no need to write interfaces separately
export type BaseScoreInput = z.infer<typeof baseScoreSchema>;
export type SingleScoreInput = z.infer<typeof singleScoreSchema>;
