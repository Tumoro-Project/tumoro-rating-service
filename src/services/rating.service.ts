import {
  TalentState,
  RatingEntry,
  BaseScoreInput,
} from "../models/IDataModels";
import { v4 as uuidv4 } from "uuid";
import { determineKFactor } from "../utilities/rating.helpers";

// In-memory data stores
const talentStates: TalentState[] = [];
const ratingEntries: RatingEntry[] = [];
const emptyScores = {
  familyTreeScore: NaN,
  assessmentScore: NaN,
  profileQualityScore: NaN,
  spotlightPerformanceScore: NaN,
  interviewScore: NaN,
};

export class RatingService {
  private clampScoreToTen(score: number): number {
    return Math.max(0, Math.min(10, score));
  }

  // Convert a 0..10 score into a signed value according to the rules:
  // - score == 3 => 0
  // - score < 3 => negative, linear from -max at 0 to 0 at 3
  // - score > 3 => positive, linear from 0 at 3 to +max at 10
  private convertToSigned(score: number, maxAbs: number): number {
    const s = this.clampScoreToTen(score);
    if (s <= 3) {
      // map [0..3] -> [-maxAbs..0]
      return (s / 3) * maxAbs - maxAbs;
    }
    // map (3..10] -> (0..maxAbs]
    return ((s - 3) / 7) * maxAbs;
  }

  public getTalentState(talentId: string): TalentState {
    let talentState = talentStates.find((ts) => ts.talentId === talentId);
    if (!talentState) {
      talentState = {
        talentId: talentId,
        currentRating: 400, // defaults: profileQuality=100, interview=100, assessment=100, familyTree=0, spotlight=100 => 400
        currentKFactor: 1.0,
        engagementCount: 0,
        lastInputScores: {
          interviewScore: 100,
          familyTreeScore: 0,
          assessmentScore: 100,
          profileQualityScore: 100,
          spotlightPerformanceScore: 100,
        },
        lastUpdated: new Date(),
      };
      talentStates.push(talentState);
    }
    return talentState;
  }

  public getRatingHistory(talentId: string): RatingEntry[] {
    return ratingEntries.filter((re) => re.talentId === talentId);
  }

  public updateTalentRating(
    talentId: string,
    inputScores: BaseScoreInput
  ): TalentState {
    return this.recalculateRating(talentId, inputScores);
  }

  public updateInterviewScore(talentId: string, score: number): TalentState {
    const talentState = this.getTalentState(talentId);
    const newInputScores = {
      ...emptyScores,
      interviewScore: score,
    };
    return this.recalculateRating(talentId, newInputScores);
  }

  public updateFamilyTreeScore(talentId: string, score: number): TalentState {
    const talentState = this.getTalentState(talentId);
    const newInputScores = {
      ...emptyScores,
      familyTreeScore: score,
    };
    return this.recalculateRating(talentId, newInputScores);
  }

  public updateAssessmentScore(talentId: string, score: number): TalentState {
    const talentState = this.getTalentState(talentId);
    const newInputScores = {
      ...emptyScores,
      assessmentScore: score,
    };
    return this.recalculateRating(talentId, newInputScores);
  }

  public updateProfileQualityScore(
    talentId: string,
    score: number
  ): TalentState {
    const talentState = this.getTalentState(talentId);
    const newInputScores = {
      ...emptyScores,
      profileQualityScore: score,
    };
    return this.recalculateRating(talentId, newInputScores);
  }

  public updateSpotlightPerformanceScore(
    talentId: string,
    score: number
  ): TalentState {
    const talentState = this.getTalentState(talentId);
    const newInputScores = {
      ...emptyScores,
      spotlightPerformanceScore: score,
    };
    return this.recalculateRating(talentId, newInputScores);
  }

  private getRatingTotal(inputScores: BaseScoreInput): number {
    return (
      (inputScores.interviewScore || 0) +
      (inputScores.assessmentScore || 0) +
      (inputScores.familyTreeScore || 0) +
      (inputScores.profileQualityScore || 0) +
      (inputScores.spotlightPerformanceScore || 0)
    );
  }

  private recalculateRating(
    talentId: string,
    inputScores: BaseScoreInput
  ): TalentState {
    const talentState = this.getTalentState(talentId);

    // Convert interview and assessment to signed deltas using specified scales
    // Interview: -30..0..+30 (3 -> 0, 0 -> -30, 10 -> +30)
    // Assessment: -25..0..+25 (3 -> 0, 0 -> -25, 10 -> +25)
    const interviewConverted = inputScores.interviewScore
      ? this.convertToSigned(Number(inputScores.interviewScore), 30)
      : 0;
    const assessmentConverted = inputScores.assessmentScore
      ? this.convertToSigned(Number(inputScores.assessmentScore), 25)
      : 0;

    // Determine k factor based on engagement count (existing helper)
    const kFactor = determineKFactor(talentState.engagementCount);

    // The interview and assessment converted values are multiplied by k and
    // applied to the previous overall rating (as a delta).
    // Apply k-factor to interview and assessment separately so they can be inspected/used independently
    const interviewDeltaApplied = interviewConverted * kFactor;
    const assessmentDeltaApplied = assessmentConverted * kFactor;

    const spotlightDeltaApplied =
      inputScores.spotlightPerformanceScore * kFactor || 0;
    const profileDeltaApplied = inputScores.profileQualityScore * kFactor || 0;
    const familyDeltaApplied = inputScores.familyTreeScore * kFactor || 0;

    const prevInputs = talentState.lastInputScores;

    const newInputScores = {
      interviewScore: interviewDeltaApplied + prevInputs.interviewScore,
      assessmentScore: assessmentDeltaApplied + prevInputs.assessmentScore,
      spotlightPerformanceScore:
        spotlightDeltaApplied + prevInputs.spotlightPerformanceScore,
      profileQualityScore: profileDeltaApplied + prevInputs.profileQualityScore,
      familyTreeScore: familyDeltaApplied + prevInputs.familyTreeScore,
    };
    const newRating = this.getRatingTotal(newInputScores);

    // New overall rating is previous rating plus converted deltas and raw field deltas
    const newEngagementCount = talentState.engagementCount + 1;

    const newTalentState: TalentState = {
      ...talentState,
      currentRating: newRating,
      currentKFactor: kFactor,
      engagementCount: newEngagementCount,
      lastInputScores: newInputScores,
      lastUpdated: new Date(),
    };

    const ratingEntry: RatingEntry = {
      entryId: uuidv4(),
      talentId: talentId,
      timestamp: new Date(),
      previousRating: talentState.currentRating,
      newRating: newRating,
      // Store a baseScore representation for auditing: include raw others and converted parts
      kFactorUsed: kFactor,
      newEngagementCount: newEngagementCount,
      inputScores: inputScores,
      currentScores: newInputScores,
    };

    // Update state atomically in memory (approximation)
    // NEXT STEP: UPDATE THIS TO USE PROPER DATABASE
    const index = talentStates.findIndex((ts) => ts.talentId === talentId);
    if (index !== -1) {
      talentStates[index] = newTalentState;
    }
    ratingEntries.push(ratingEntry);

    return newTalentState;
  }
}
