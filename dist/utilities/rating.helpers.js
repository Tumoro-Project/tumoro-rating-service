"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBaseScore = calculateBaseScore;
exports.determineKFactor = determineKFactor;
exports.calculateNewRating = calculateNewRating;
function convertInterviewScore(score) {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Interview score must be between 0 and 10.");
    }
    if (score <= 3) {
        return 10 * score - 30;
    }
    else {
        return (30 / 7) * score - (90 / 7);
    }
}
function convertAssessmentScore(score) {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Assessment score must be between 0 and 10.");
    }
    if (score <= 3) {
        return (25 / 3) * score - 25;
    }
    else {
        return (25 / 7) * score - (75 / 7);
    }
}
function calculateBaseScore(inputScores) {
    const convertedInterviewScore = convertInterviewScore(inputScores.interviewScore ?? 0);
    const convertedAssessmentScore = convertAssessmentScore(inputScores.assessmentScore ?? 0);
    const baseScore = convertedInterviewScore +
        convertedAssessmentScore +
        (inputScores.familyTreeScore ?? 0) +
        (inputScores.profileQualityScore ?? 0) +
        (inputScores.spotlightPerformanceScore ?? 0);
    return baseScore;
}
function determineKFactor(engagementCount) {
    if (engagementCount <= 10) {
        return 1.0; // Tier 1: New Talent
    }
    else if (engagementCount <= 30) {
        return 0.5; // Tier 2: Developing Talent
    }
    else {
        return 0.2; // Tier 3: Established Talent
    }
}
function calculateNewRating(currentRating, baseScore, kFactor) {
    return currentRating + kFactor * baseScore;
}
