"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingService = void 0;
const rating_helpers_1 = require("../utilities/rating.helpers");
const database_1 = require("../config/database");
// Default accumulated scores for a brand-new talent
const DEFAULT_SCORES = {
    interviewScore: 100,
    familyTreeScore: 0,
    assessmentScore: 100,
    profileQualityScore: 100,
    spotlightPerformanceScore: 100,
};
const DEFAULT_RATING = 400; // sum of defaults above
class RatingService {
    // ─── Helpers ──────────────────────────────────────────────────────────────
    rowToTalentState(row) {
        return {
            talentId: row.talent_id,
            currentRating: Number(row.current_rating),
            currentKFactor: Number(row.current_k_factor),
            engagementCount: Number(row.engagement_count),
            lastInputScores: {
                interviewScore: Number(row.interview_score),
                familyTreeScore: Number(row.family_tree_score),
                assessmentScore: Number(row.assessment_score),
                profileQualityScore: Number(row.profile_quality_score),
                spotlightPerformanceScore: Number(row.spotlight_performance_score),
            },
            lastUpdated: new Date(row.last_updated),
        };
    }
    rowToRatingEntry(row) {
        return {
            entryId: row.entry_id,
            talentId: row.talent_id,
            timestamp: new Date(row.timestamp),
            previousRating: Number(row.previous_rating),
            newRating: Number(row.new_rating),
            kFactorUsed: Number(row.k_factor_used),
            newEngagementCount: Number(row.new_engagement_count),
            inputScores: {
                interviewScore: Number(row.input_interview_score),
                familyTreeScore: Number(row.input_family_tree_score),
                assessmentScore: Number(row.input_assessment_score),
                profileQualityScore: Number(row.input_profile_quality_score),
                spotlightPerformanceScore: Number(row.input_spotlight_performance_score),
            },
            currentScores: {
                interviewScore: Number(row.current_interview_score),
                familyTreeScore: Number(row.current_family_tree_score),
                assessmentScore: Number(row.current_assessment_score),
                profileQualityScore: Number(row.current_profile_quality_score),
                spotlightPerformanceScore: Number(row.current_spotlight_performance_score),
            },
        };
    }
    convertToSigned(score, maxAbs) {
        const s = Math.max(0, Math.min(10, score));
        if (s <= 3)
            return (s / 3) * maxAbs - maxAbs;
        return ((s - 3) / 7) * maxAbs;
    }
    getRatingTotal(scores) {
        return ((scores.interviewScore || 0) +
            (scores.assessmentScore || 0) +
            (scores.familyTreeScore || 0) +
            (scores.profileQualityScore || 0) +
            (scores.spotlightPerformanceScore || 0));
    }
    // ─── Public API ───────────────────────────────────────────────────────────
    /**
     * Fetches the talent's current state from the DB.
     * If the talent doesn't exist, creates a default record (UPSERT).
     */
    getTalentState(talentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // UPSERT: insert default row if not present, then return current row
            const { rows } = yield database_1.pool.query(`INSERT INTO talent_states (
          talent_id, current_rating, current_k_factor, engagement_count,
          interview_score, family_tree_score, assessment_score,
          profile_quality_score, spotlight_performance_score, last_updated
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (talent_id) DO NOTHING
       RETURNING *`, [
                talentId,
                DEFAULT_RATING,
                1.0,
                0,
                DEFAULT_SCORES.interviewScore,
                DEFAULT_SCORES.familyTreeScore,
                DEFAULT_SCORES.assessmentScore,
                DEFAULT_SCORES.profileQualityScore,
                DEFAULT_SCORES.spotlightPerformanceScore,
            ]);
            if (rows.length > 0)
                return this.rowToTalentState(rows[0]);
            // Row already existed — fetch it
            const existing = yield database_1.pool.query(`SELECT * FROM talent_states WHERE talent_id = $1`, [talentId]);
            return this.rowToTalentState(existing.rows[0]);
        });
    }
    /**
     * Returns the full rating history for a talent, newest first.
     */
    getRatingHistory(talentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { rows } = yield database_1.pool.query(`SELECT * FROM rating_entries WHERE talent_id = $1 ORDER BY timestamp DESC`, [talentId]);
            return rows.map((r) => this.rowToRatingEntry(r));
        });
    }
    /**
     * Updates all score components at once.
     */
    updateTalentRating(talentId, inputScores) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, inputScores);
        });
    }
    updateInterviewScore(talentId, score) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, { interviewScore: score });
        });
    }
    updateFamilyTreeScore(talentId, score) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, { familyTreeScore: score });
        });
    }
    updateAssessmentScore(talentId, score) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, { assessmentScore: score });
        });
    }
    updateProfileQualityScore(talentId, score) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, { profileQualityScore: score });
        });
    }
    updateSpotlightPerformanceScore(talentId, score) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.recalculateRating(talentId, { spotlightPerformanceScore: score });
        });
    }
    // ─── Core Calculation ─────────────────────────────────────────────────────
    recalculateRating(talentId, inputScores) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const client = yield database_1.pool.connect();
            try {
                yield client.query('BEGIN');
                const current = yield this.getTalentState(talentId);
                const prevScores = current.lastInputScores;
                const kFactor = (0, rating_helpers_1.determineKFactor)(current.engagementCount);
                // Convert into signed deltas ONLY if the score is provided
                const interviewDelta = inputScores.interviewScore !== undefined
                    ? this.convertToSigned(inputScores.interviewScore, 30) * kFactor
                    : 0;
                const assessmentDelta = inputScores.assessmentScore !== undefined
                    ? this.convertToSigned(inputScores.assessmentScore, 25) * kFactor
                    : 0;
                const spotlightDelta = inputScores.spotlightPerformanceScore !== undefined
                    ? (inputScores.spotlightPerformanceScore || 0) * kFactor
                    : 0;
                const profileDelta = inputScores.profileQualityScore !== undefined
                    ? (inputScores.profileQualityScore || 0) * kFactor
                    : 0;
                const familyDelta = inputScores.familyTreeScore !== undefined
                    ? (inputScores.familyTreeScore || 0) * kFactor
                    : 0;
                // Accumulate on top of previous scores
                const newScores = {
                    interviewScore: ((_a = prevScores.interviewScore) !== null && _a !== void 0 ? _a : 0) + interviewDelta,
                    assessmentScore: ((_b = prevScores.assessmentScore) !== null && _b !== void 0 ? _b : 0) + assessmentDelta,
                    spotlightPerformanceScore: ((_c = prevScores.spotlightPerformanceScore) !== null && _c !== void 0 ? _c : 0) + spotlightDelta,
                    profileQualityScore: ((_d = prevScores.profileQualityScore) !== null && _d !== void 0 ? _d : 0) + profileDelta,
                    familyTreeScore: ((_e = prevScores.familyTreeScore) !== null && _e !== void 0 ? _e : 0) + familyDelta,
                };
                const newRating = this.getRatingTotal(newScores);
                const newEngagementCount = current.engagementCount + 1;
                // 1. Update talent_states row
                yield client.query(`UPDATE talent_states SET
            current_rating              = $1,
            current_k_factor            = $2,
            engagement_count            = $3,
            interview_score             = $4,
            family_tree_score           = $5,
            assessment_score            = $6,
            profile_quality_score       = $7,
            spotlight_performance_score = $8,
            last_updated                = NOW()
          WHERE talent_id = $9`, [
                    newRating,
                    kFactor,
                    newEngagementCount,
                    newScores.interviewScore,
                    newScores.familyTreeScore,
                    newScores.assessmentScore,
                    newScores.profileQualityScore,
                    newScores.spotlightPerformanceScore,
                    talentId,
                ]);
                // 2. Insert rating_entries audit row
                yield client.query(`INSERT INTO rating_entries (
            talent_id, previous_rating, new_rating, k_factor_used, new_engagement_count,
            input_interview_score, input_family_tree_score, input_assessment_score,
            input_profile_quality_score, input_spotlight_performance_score,
            current_interview_score, current_family_tree_score, current_assessment_score,
            current_profile_quality_score, current_spotlight_performance_score
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [
                    talentId,
                    current.currentRating,
                    newRating,
                    kFactor,
                    newEngagementCount,
                    inputScores.interviewScore,
                    inputScores.familyTreeScore,
                    inputScores.assessmentScore,
                    inputScores.profileQualityScore,
                    inputScores.spotlightPerformanceScore,
                    newScores.interviewScore,
                    newScores.familyTreeScore,
                    newScores.assessmentScore,
                    newScores.profileQualityScore,
                    newScores.spotlightPerformanceScore,
                ]);
                yield client.query('COMMIT');
                return {
                    talentId,
                    currentRating: newRating,
                    currentKFactor: kFactor,
                    engagementCount: newEngagementCount,
                    lastInputScores: newScores,
                    lastUpdated: new Date(),
                };
            }
            catch (err) {
                yield client.query('ROLLBACK');
                throw err;
            }
            finally {
                client.release();
            }
        });
    }
}
exports.RatingService = RatingService;
