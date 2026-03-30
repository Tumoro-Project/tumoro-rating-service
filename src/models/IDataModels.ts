export interface BaseScoreInput {
  interviewScore?: number;
  familyTreeScore?: number;
  assessmentScore?: number;
  profileQualityScore?: number;
  spotlightPerformanceScore?: number;
}

export interface TalentState {
  talentId: string;
  currentRating: number;
  currentKFactor: number;
  engagementCount: number;
  lastInputScores: BaseScoreInput;
  lastUpdated: Date;
}

export interface RatingEntry {
  entryId: string;
  talentId: string;
  timestamp: Date;
  previousRating: number;
  newRating: number;
  kFactorUsed: number;
  newEngagementCount: number;
  inputScores: BaseScoreInput;
  currentScores: BaseScoreInput;
}
