
import { BaseScoreInput } from '../models/IDataModels';

function convertInterviewScore(score: number): number {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Interview score must be between 0 and 10.");
    }
    if (score <= 3) {
        return 10 * score - 30;
    } else {
        return (30 / 7) * score - (90 / 7);
    }
}

function convertAssessmentScore(score: number): number {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Assessment score must be between 0 and 10.");
    }
    if (score <= 3) {
        return (25 / 3) * score - 25;
    } else {
        return (25 / 7) * score - (75 / 7);
    }
}

export function calculateBaseScore(inputScores: BaseScoreInput): number {
    const convertedInterviewScore = convertInterviewScore(inputScores.interviewScore);
    const convertedAssessmentScore = convertAssessmentScore(inputScores.assessmentScore);

    const baseScore =
        convertedInterviewScore +
        convertedAssessmentScore +
        inputScores.familyTreeScore +
        inputScores.profileQualityScore +
        inputScores.spotlightPerformanceScore;

    return baseScore;
}

export function determineKFactor(engagementCount: number): number {
    if (engagementCount <= 10) {
        return 1.0; // Tier 1: New Talent
    } else if (engagementCount <= 30) {
        return 0.5; // Tier 2: Developing Talent
    } else {
        return 0.2; // Tier 3: Established Talent
    }
}

export function calculateNewRating(currentRating: number, baseScore: number, kFactor: number): number {
    return currentRating + kFactor * baseScore;
}
