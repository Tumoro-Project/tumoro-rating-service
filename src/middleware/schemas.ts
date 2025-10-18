import Joi from "joi";

export const baseScoreSchema = Joi.object({
  interviewScore: Joi.number().min(0).max(10).required(),
  familyTreeScore: Joi.number().min(0).max(10).required(),
  assessmentScore: Joi.number().min(0).max(10).required(),
  profileQualityScore: Joi.number().min(0).max(10).required(),
  spotlightPerformanceScore: Joi.number().min(0).required(),
});

export const singleScoreSchema = Joi.object({
  score: Joi.number().min(0).max(10).required(),
});
