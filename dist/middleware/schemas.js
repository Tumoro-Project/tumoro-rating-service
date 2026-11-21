"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.characterRatingSchema = exports.familyTreeScoreSchema = exports.familyTreeAnswerValueSchema = exports.singleScoreSchema = exports.baseScoreSchema = void 0;
const zod_1 = require("zod");
exports.baseScoreSchema = zod_1.z.object({
    interviewScore: zod_1.z.number().min(0).max(10),
    familyTreeScore: zod_1.z.number().min(0).max(10),
    assessmentScore: zod_1.z.number().min(0).max(10),
    profileQualityScore: zod_1.z.number().min(0).max(10),
    spotlightPerformanceScore: zod_1.z.number().min(0),
});
exports.singleScoreSchema = zod_1.z.object({
    score: zod_1.z.number().min(0).max(10),
});
exports.familyTreeAnswerValueSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.array(zod_1.z.string()),
]);
exports.familyTreeScoreSchema = zod_1.z
    .object({
    score: zod_1.z.number().min(0).max(100).optional(),
    rawPoints: zod_1.z.number().min(0).max(100).optional(),
    answers: zod_1.z.record(exports.familyTreeAnswerValueSchema).optional(),
    mode: zod_1.z.enum(["set", "delta"]).optional(),
})
    .refine((data) => data.score !== undefined ||
    data.rawPoints !== undefined ||
    (data.answers !== undefined && Object.keys(data.answers).length > 0), {
    message: "At least one of score, rawPoints, or answers must be provided",
    path: ["score"],
});
exports.characterRatingSchema = zod_1.z.object({
    talentId: zod_1.z.string().trim().min(1, "talentId is required"),
    integrity: zod_1.z.number().int().min(1).max(5),
    consistency: zod_1.z.number().int().min(1).max(5),
    investmentInOthers: zod_1.z.number().int().min(1).max(5),
    longTermThinking: zod_1.z.number().int().min(1).max(5),
    honesty: zod_1.z.number().int().min(1).max(5),
    raterRelationship: zod_1.z.enum(["PROFESSIONAL", "COLLEAGUE", "COMMUNITY", "MENTOR"]),
    anonymous: zod_1.z.boolean().optional().default(true),
    sessionId: zod_1.z.string().trim().min(1).optional(),
});
