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

export const familyTreeAnswerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
]);

export const familyTreeScoreSchema = z
  .object({
    score: z.number().min(0).max(100).optional(),
    rawPoints: z.number().min(0).max(100).optional(),
    answers: z.record(familyTreeAnswerValueSchema).optional(),
    mode: z.enum(["set", "delta"]).optional(),
  })
  .refine(
    (data) =>
      data.score !== undefined ||
      data.rawPoints !== undefined ||
      (data.answers !== undefined && Object.keys(data.answers).length > 0),
    {
      message: "At least one of score, rawPoints, or answers must be provided",
      path: ["score"],
    }
  );

export const characterRatingSchema = z.object({
  talentId: z.string().trim().min(1, "talentId is required"),
  integrity: z.number().int().min(1).max(5),
  consistency: z.number().int().min(1).max(5),
  investmentInOthers: z.number().int().min(1).max(5),
  longTermThinking: z.number().int().min(1).max(5),
  honesty: z.number().int().min(1).max(5),
  raterRelationship: z.enum(["PROFESSIONAL", "COLLEAGUE", "COMMUNITY", "MENTOR"]),
  anonymous: z.boolean().optional().default(true),
  sessionId: z.string().trim().min(1).optional(),
});

// Inferred TypeScript types — no need to write interfaces separately
export type BaseScoreInput = z.infer<typeof baseScoreSchema>;
export type SingleScoreInput = z.infer<typeof singleScoreSchema>;
export type FamilyTreeScoreInput = z.infer<typeof familyTreeScoreSchema>;
export type CharacterRatingInput = z.infer<typeof characterRatingSchema>;
