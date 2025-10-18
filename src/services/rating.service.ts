
import { TalentState, RatingEntry, BaseScoreInput } from '../models/IDataModels';
import { v4 as uuidv4 } from 'uuid';
import { calculateBaseScore, determineKFactor, calculateNewRating } from '../utilities/rating.helpers';

// In-memory data stores
const talentStates: TalentState[] = [];
const ratingEntries: RatingEntry[] = [];

export class RatingService {

    public getTalentState(talentId: string): TalentState {
        let talentState = talentStates.find(ts => ts.talentId === talentId);
        if (!talentState) {
            talentState = {
                talentId: talentId,
                currentRating: 400,
                currentKFactor: 1.0,
                engagementCount: 0,
                lastInputScores: {
                    interviewScore: 0,
                    familyTreeScore: 0,
                    assessmentScore: 0,
                    profileQualityScore: 0,
                    spotlightPerformanceScore: 0,
                },
                lastUpdated: new Date(),
            };
            talentStates.push(talentState);
        }
        return talentState;
    }

    public getRatingHistory(talentId: string): RatingEntry[] {
        return ratingEntries.filter(re => re.talentId === talentId);
    }

    public updateTalentRating(talentId: string, inputScores: BaseScoreInput): TalentState {
        const talentState = this.getTalentState(talentId);
        const newTalentState = this.recalculateRating(talentId, inputScores);
        return newTalentState;
    }

    public updateInterviewScore(talentId: string, score: number): TalentState {
        const talentState = this.getTalentState(talentId);
        const newIputScores = { ...talentState.lastInputScores, interviewScore: score };
        return this.recalculateRating(talentId, newIputScores);
    }

    public updateFamilyTreeScore(talentId: string, score: number): TalentState {
        const talentState = this.getTalentState(talentId);
        const newIputScores = { ...talentState.lastInputScores, familyTreeScore: score };
        return this.recalculateRating(talentId, newIputScores);
    }

    public updateAssessmentScore(talentId: string, score: number): TalentState {
        const talentState = this.getTalentState(talentId);
        const newIputScores = { ...talentState.lastInputScores, assessmentScore: score };
        return this.recalculateRating(talentId, newIputScores);
    }

    public updateProfileQualityScore(talentId: string, score: number): TalentState {
        const talentState = this.getTalentState(talentId);
        const newIputScores = { ...talentState.lastInputScores, profileQualityScore: score };
        return this.recalculateRating(talentId, newIputScores);
    }

    public updateSpotlightPerformanceScore(talentId: string, score: number): TalentState {
        const talentState = this.getTalentState(talentId);
        const newIputScores = { ...talentState.lastInputScores, spotlightPerformanceScore: score };
        return this.recalculateRating(talentId, newIputScores);
    }

    private recalculateRating(talentId: string, inputScores: BaseScoreInput): TalentState {
        const talentState = this.getTalentState(talentId);

        const baseScore = calculateBaseScore(inputScores);
        const kFactor = determineKFactor(talentState.engagementCount);
        const newRating = calculateNewRating(talentState.currentRating, baseScore, kFactor);

        const newEngagementCount = talentState.engagementCount + 1;

        const newTalentState: TalentState = {
            ...talentState,
            currentRating: newRating,
            currentKFactor: kFactor,
            engagementCount: newEngagementCount,
            lastInputScores: inputScores,
            lastUpdated: new Date(),
        };

        const ratingEntry: RatingEntry = {
            entryId: uuidv4(),
            talentId: talentId,
            timestamp: new Date(),
            previousRating: talentState.currentRating,
            newRating: newRating,
            baseScore: baseScore,
            kFactorUsed: kFactor,
            newEngagementCount: newEngagementCount,
            inputScores: inputScores,
        };

        // In a real application, this would be an atomic transaction
        const index = talentStates.findIndex(ts => ts.talentId === talentId);
        if (index !== -1) {
            talentStates[index] = newTalentState;
        }
        ratingEntries.push(ratingEntry);

        return newTalentState;
    }
}
