"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleScoreSchema = exports.baseScoreSchema = void 0;
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
