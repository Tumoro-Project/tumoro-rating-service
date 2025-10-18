
import { BaseScoreInput } from '../models/IDataModels';

const WEIGHTS = {
    interviewScore: 0.35,
    familyTreeScore: 0.35,
    assessmentScore: 0.25,
    profileQualityScore: 0.03,
    spotlightPerformanceScore: 0.02,
};

export function calculateBaseScore(inputScores: BaseScoreInput): number {
    const baseScore =
        inputScores.interviewScore * WEIGHTS.interviewScore +
        inputScores.familyTreeScore * WEIGHTS.familyTreeScore +
        inputScores.assessmentScore * WEIGHTS.assessmentScore +
        inputScores.profileQualityScore * WEIGHTS.profileQualityScore +
        inputScores.spotlightPerformanceScore * WEIGHTS.spotlightPerformanceScore;
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
    return currentRating + kFactor * (baseScore - currentRating);
}
