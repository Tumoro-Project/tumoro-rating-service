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
    var _a, _b, _c, _d, _e;
    const convertedInterviewScore = convertInterviewScore((_a = inputScores.interviewScore) !== null && _a !== void 0 ? _a : 0);
    const convertedAssessmentScore = convertAssessmentScore((_b = inputScores.assessmentScore) !== null && _b !== void 0 ? _b : 0);
    const baseScore = convertedInterviewScore +
        convertedAssessmentScore +
        ((_c = inputScores.familyTreeScore) !== null && _c !== void 0 ? _c : 0) +
        ((_d = inputScores.profileQualityScore) !== null && _d !== void 0 ? _d : 0) +
        ((_e = inputScores.spotlightPerformanceScore) !== null && _e !== void 0 ? _e : 0);
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
