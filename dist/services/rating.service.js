"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingService = void 0;
const rating_helpers_1 = require("../utilities/rating.helpers");
const database_1 = require("../config/database");
// Default accumulated scores for a brand-new talent
const DEFAULT_SCORES = {
    interviewScore: 0,
    familyTreeScore: 0,
    assessmentScore: 0,
    profileQualityScore: 0,
    spotlightPerformanceScore: 0,
};
const DEFAULT_RATING = 0; // sum of defaults above
class RatingService {
    // ─── Helpers ──────────────────────────────────────────────────────────────
    rowToTalentState(row) {
        return {
            talentId: row.talent_id,
            currentRating: Number(Number(row.current_rating).toFixed(2)),
            currentKFactor: Number(Number(row.current_k_factor).toFixed(2)),
            engagementCount: Number(row.engagement_count),
            lastInputScores: {
                interviewScore: Number(Number(row.interview_score).toFixed(2)),
                familyTreeScore: Number(Number(row.family_tree_score).toFixed(2)),
                assessmentScore: Number(Number(row.assessment_score).toFixed(2)),
                profileQualityScore: Number(Number(row.profile_quality_score).toFixed(2)),
                spotlightPerformanceScore: Number(Number(row.spotlight_performance_score).toFixed(2)),
            },
            lastUpdated: new Date(row.last_updated),
        };
    }
    rowToRatingEntry(row) {
        return {
            entryId: row.entry_id,
            talentId: row.talent_id,
            timestamp: new Date(row.timestamp),
            previousRating: Number(Number(row.previous_rating).toFixed(2)),
            newRating: Number(Number(row.new_rating).toFixed(2)),
            kFactorUsed: Number(Number(row.k_factor_used).toFixed(2)),
            newEngagementCount: Number(row.new_engagement_count),
            inputScores: {
                interviewScore: Number(Number(row.input_interview_score).toFixed(2)),
                familyTreeScore: Number(Number(row.input_family_tree_score).toFixed(2)),
                assessmentScore: Number(Number(row.input_assessment_score).toFixed(2)),
                profileQualityScore: Number(Number(row.input_profile_quality_score).toFixed(2)),
                spotlightPerformanceScore: Number(Number(row.input_spotlight_performance_score).toFixed(2)),
            },
            currentScores: {
                interviewScore: Number(Number(row.current_interview_score).toFixed(2)),
                familyTreeScore: Number(Number(row.current_family_tree_score).toFixed(2)),
                assessmentScore: Number(Number(row.current_assessment_score).toFixed(2)),
                profileQualityScore: Number(Number(row.current_profile_quality_score).toFixed(2)),
                spotlightPerformanceScore: Number(Number(row.current_spotlight_performance_score).toFixed(2)),
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
        const rawFamily = scores.familyTreeScore || 0;
        // Family Tree Lineage Score is 0–10. Without family tree connected, it contributes strictly 0.
        // When connected (0–10), it contributes up to +100 points on 1000 scale (+1.00 on 10 scale).
        const familyOutOf10 = rawFamily > 10 ? rawFamily / 10 : rawFamily;
        const familyRatingContribution = Math.round(Math.max(0, Math.min(10, familyOutOf10)) * 10);
        const interview = Math.max(0, Math.min(400, scores.interviewScore ?? 0));
        const assessment = Math.max(0, Math.min(250, scores.assessmentScore ?? 0));
        const profile = Math.max(0, Math.min(250, scores.profileQualityScore ?? 0));
        const spotlight = Math.max(0, Math.min(100, scores.spotlightPerformanceScore ?? 0));
        // Sum of pillars with 0 foundation base (range 0–1000, i.e. 0.00–10.00)
        const total = profile + familyRatingContribution + interview + assessment + spotlight;
        return Math.min(1000, Math.max(0, total));
    }
    // ─── Public API ───────────────────────────────────────────────────────────
    /**
     * Fetches the talent's current state from the DB.
     * If the talent doesn't exist, creates a default record (UPSERT).
     */
    async getTalentState(talentId) {
        // UPSERT: insert default row if not present, then return current row
        const { rows } = await database_1.pool.query(`INSERT INTO talent_states (
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
        const existing = await database_1.pool.query(`SELECT * FROM talent_states WHERE talent_id = $1`, [talentId]);
        return this.rowToTalentState(existing.rows[0]);
    }
    /**
     * Returns the full rating history for a talent, newest first.
     */
    async getRatingHistory(talentId) {
        const { rows } = await database_1.pool.query(`SELECT * FROM rating_entries WHERE talent_id = $1 ORDER BY timestamp DESC`, [talentId]);
        return rows.map((r) => this.rowToRatingEntry(r));
    }
    /**
     * Returns the fastest growing talent (Momentum) for the week.
     * Momentum = (Rating Delta over 7 days) * (Engagement Count over 7 days) / K_factor
     */
    async getTrendingTalent(limit = 10) {
        const { rows } = await database_1.pool.query(`WITH weekly_deltas AS (
        SELECT 
          ts.talent_id,
          ts.current_rating,
          ts.current_k_factor,
          -- Get the oldest rating within the last 7 days for each user
          FIRST_VALUE(re.new_rating) OVER (PARTITION BY ts.talent_id ORDER BY re.timestamp ASC) as start_week_rating,
          -- Count engagements in the last 7 days
          COUNT(*) OVER (PARTITION BY ts.talent_id) as weekly_engagements
        FROM talent_states ts
        JOIN rating_entries re ON re.talent_id = ts.talent_id
        WHERE re.timestamp >= NOW() - INTERVAL '7 days'
      )
      SELECT DISTINCT
        talent_id,
        current_rating,
        weekly_engagements,
        (current_rating - start_week_rating) as rating_delta,
        -- Momentum Score: (Delta * Engagements) / K_factor
        -- We multiply by (1/K_factor) so Tier 3 (K=0.2) gets a 5x boost vs Tier 1 (K=1.0)
        ((current_rating - start_week_rating) * weekly_engagements / current_k_factor) as momentum_score
      FROM weekly_deltas
      ORDER BY momentum_score DESC
      LIMIT $1`, [limit]);
        return rows;
    }
    /**
     * Updates all score components at once.
     */
    async updateTalentRating(talentId, inputScores) {
        return this.recalculateRating(talentId, inputScores);
    }
    async updateInterviewScore(talentId, score) {
        return this.recalculateRating(talentId, { interviewScore: score });
    }
    async updateFamilyTreeScore(talentId, score, mode = 'set') {
        return this.recalculateRating(talentId, { familyTreeScore: (0, rating_helpers_1.normalizeFamilyTreeScore)(score) }, { familyTreeMode: mode });
    }
    async updateAssessmentScore(talentId, score) {
        return this.recalculateRating(talentId, { assessmentScore: score });
    }
    async updateProfileQualityScore(talentId, score) {
        return this.recalculateRating(talentId, { profileQualityScore: score });
    }
    async updateSpotlightPerformanceScore(talentId, score) {
        return this.recalculateRating(talentId, { spotlightPerformanceScore: score });
    }
    // ─── Core Calculation ─────────────────────────────────────────────────────
    async recalculateRating(talentId, inputScores, options) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const current = await this.getTalentState(talentId);
            const prevScores = current.lastInputScores;
            const kFactor = (0, rating_helpers_1.determineKFactor)(current.engagementCount);
            // Update profile quality score: if passed as 0-10 scale, convert to 0-250; if passed as 0-250, clamp.
            let nextProfileScore = prevScores.profileQualityScore ?? 0;
            if (inputScores.profileQualityScore !== undefined) {
                const pInput = inputScores.profileQualityScore;
                nextProfileScore = pInput <= 10 ? Math.round(pInput * 25) : Math.min(250, Math.max(0, pInput));
            }
            // Interview score: if passed as 0-10 scale, convert to 0-400; if passed as 0-400, clamp.
            let nextInterviewScore = prevScores.interviewScore ?? 0;
            if (inputScores.interviewScore !== undefined) {
                const iInput = inputScores.interviewScore;
                nextInterviewScore = iInput <= 10 ? Math.round(iInput * 40) : Math.min(400, Math.max(0, iInput));
            }
            // Assessment score: if passed as 0-10 scale, convert to 0-250; if passed as 0-250, clamp.
            let nextAssessmentScore = prevScores.assessmentScore ?? 0;
            if (inputScores.assessmentScore !== undefined) {
                const aInput = inputScores.assessmentScore;
                nextAssessmentScore = aInput <= 10 ? Math.round(aInput * 25) : Math.min(250, Math.max(0, aInput));
            }
            let nextSpotlightScore = prevScores.spotlightPerformanceScore ?? 0;
            if (inputScores.spotlightPerformanceScore !== undefined) {
                nextSpotlightScore = Math.min(100, Math.max(0, inputScores.spotlightPerformanceScore));
            }
            let nextFamilyTreeScore = Number((prevScores.familyTreeScore ?? 0).toFixed(2));
            if (inputScores.familyTreeScore !== undefined) {
                const normalizedInput = (0, rating_helpers_1.normalizeFamilyTreeScore)(inputScores.familyTreeScore);
                if ((options?.familyTreeMode ?? 'set') === 'set') {
                    // Questionnaire score sets/replaces the talent's Lineage Score (0–10), including 0 on reset
                    nextFamilyTreeScore = normalizedInput;
                }
                else {
                    // Incremental bonus (e.g. referral completion), clamped to 0–10
                    const delta = normalizedInput * kFactor;
                    nextFamilyTreeScore = Number(Math.min(10, Math.max(0, (prevScores.familyTreeScore ?? 0) + delta)).toFixed(2));
                }
            }
            const newScores = {
                interviewScore: nextInterviewScore,
                assessmentScore: nextAssessmentScore,
                spotlightPerformanceScore: nextSpotlightScore,
                profileQualityScore: nextProfileScore,
                familyTreeScore: nextFamilyTreeScore,
            };
            const newRating = Number(this.getRatingTotal(newScores).toFixed(2));
            const newEngagementCount = current.engagementCount + 1;
            // 1. Update talent_states row
            await client.query(`UPDATE talent_states SET
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
            await client.query(`INSERT INTO rating_entries (
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
            await client.query('COMMIT');
            // Immediately propagate updated rating to search service index
            this.syncRatingToServices(talentId, newRating, newScores).catch((syncErr) => {
                console.warn('[RatingService] Non-blocking sync error:', syncErr?.message || syncErr);
            });
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
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Submit or update a peer character rating for a talent.
     * Updates talent_states.character_score without changing the 4-pillar current_rating.
     */
    async submitCharacterRating(raterId, input) {
        if (raterId === input.talentId) {
            const err = new Error('You cannot rate your own character.');
            err.statusCode = 400;
            throw err;
        }
        // Ensure target talent exists in talent_states
        await this.getTalentState(input.talentId);
        await database_1.pool.query(`INSERT INTO character_ratings (
         talent_id, rater_id, integrity, consistency, investment_in_others,
         long_term_thinking, honesty, rater_relationship, anonymous, session_id,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       ON CONFLICT (talent_id, rater_id) DO UPDATE SET
         integrity = EXCLUDED.integrity,
         consistency = EXCLUDED.consistency,
         investment_in_others = EXCLUDED.investment_in_others,
         long_term_thinking = EXCLUDED.long_term_thinking,
         honesty = EXCLUDED.honesty,
         rater_relationship = EXCLUDED.rater_relationship,
         anonymous = EXCLUDED.anonymous,
         session_id = COALESCE(EXCLUDED.session_id, character_ratings.session_id),
         updated_at = NOW()`, [
            input.talentId,
            raterId,
            input.integrity,
            input.consistency,
            input.investmentInOthers,
            input.longTermThinking,
            input.honesty,
            input.raterRelationship,
            input.anonymous ?? true,
            input.sessionId ?? null,
        ]);
        const aggRes = await database_1.pool.query(`SELECT
         COUNT(*)::int AS total_count,
         COALESCE(AVG((integrity + consistency + investment_in_others + long_term_thinking + honesty) / 5.0), 0)::float AS avg_score
       FROM character_ratings
       WHERE talent_id = $1`, [input.talentId]);
        const totalCount = Number(aggRes.rows[0]?.total_count || 0);
        const newCharacterScore = Number(Number(aggRes.rows[0]?.avg_score || 0).toFixed(2));
        await database_1.pool.query(`UPDATE talent_states
       SET character_score = $1, last_updated = NOW()
       WHERE talent_id = $2`, [newCharacterScore, input.talentId]);
        return {
            success: true,
            message: 'Character rating saved',
            newCharacterScore,
            totalCount,
        };
    }
    /**
     * Returns aggregated peer character breakdown for a talent.
     * Individual dimension averages remain hidden (0) until totalCount >= 5.
     */
    async getCharacterBreakdown(talentId, viewerId) {
        const aggRes = await database_1.pool.query(`SELECT
         COUNT(*)::int AS total_count,
         COALESCE(AVG(integrity), 0)::float AS avg_integrity,
         COALESCE(AVG(consistency), 0)::float AS avg_consistency,
         COALESCE(AVG(investment_in_others), 0)::float AS avg_investment,
         COALESCE(AVG(long_term_thinking), 0)::float AS avg_long_term,
         COALESCE(AVG(honesty), 0)::float AS avg_honesty,
         COUNT(*) FILTER (WHERE rater_relationship = 'PROFESSIONAL')::int AS rel_professional,
         COUNT(*) FILTER (WHERE rater_relationship = 'COLLEAGUE')::int AS rel_colleague,
         COUNT(*) FILTER (WHERE rater_relationship = 'COMMUNITY')::int AS rel_community,
         COUNT(*) FILTER (WHERE rater_relationship = 'MENTOR')::int AS rel_mentor,
         COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '90 days')::int AS recent_count,
         COALESCE(AVG((integrity + consistency + investment_in_others + long_term_thinking + honesty) / 5.0) FILTER (WHERE updated_at >= NOW() - INTERVAL '90 days'), 0)::float AS recent_avg
       FROM character_ratings
       WHERE talent_id = $1`, [talentId]);
        const row = aggRes.rows[0] || {};
        const totalCount = Number(row.total_count || 0);
        const publicScore = totalCount >= 5;
        const recentCount = Number(row.recent_count || 0);
        const recentAvg = Number(row.recent_avg || 0);
        const round2 = (v) => Number(Number(v || 0).toFixed(2));
        let viewerHasRated;
        let viewerRating;
        if (viewerId) {
            const viewerRes = await database_1.pool.query(`SELECT integrity, consistency, investment_in_others, long_term_thinking, honesty, rater_relationship, anonymous
         FROM character_ratings
         WHERE talent_id = $1 AND rater_id = $2
         LIMIT 1`, [talentId, viewerId]);
            const vr = viewerRes.rows[0];
            viewerHasRated = Boolean(vr);
            if (vr) {
                viewerRating = {
                    integrity: Number(vr.integrity),
                    consistency: Number(vr.consistency),
                    investmentInOthers: Number(vr.investment_in_others),
                    longTermThinking: Number(vr.long_term_thinking),
                    honesty: Number(vr.honesty),
                    raterRelationship: String(vr.rater_relationship),
                    anonymous: Boolean(vr.anonymous),
                };
            }
        }
        return {
            totalCount,
            publicScore,
            averages: publicScore
                ? {
                    integrity: round2(row.avg_integrity),
                    consistency: round2(row.avg_consistency),
                    investmentInOthers: round2(row.avg_investment),
                    longTermThinking: round2(row.avg_long_term),
                    honesty: round2(row.avg_honesty),
                }
                : {
                    integrity: 0,
                    consistency: 0,
                    investmentInOthers: 0,
                    longTermThinking: 0,
                    honesty: 0,
                },
            raterRelationshipCounts: {
                PROFESSIONAL: Number(row.rel_professional || 0),
                COLLEAGUE: Number(row.rel_colleague || 0),
                COMMUNITY: Number(row.rel_community || 0),
                MENTOR: Number(row.rel_mentor || 0),
            },
            hasCharacterMomentum: recentCount >= 2 && recentAvg >= 3.8,
            ...(viewerId ? { viewerHasRated, viewerRating } : {}),
        };
    }
    /**
     * Propagates rating updates immediately to the search cache and related services.
     */
    async syncRatingToServices(talentId, newRating, _scores) {
        const searchUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3004';
        const base = searchUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
        const serviceSecret = process.env.SERVICE_SECRET;
        const headers = { 'Content-Type': 'application/json' };
        if (serviceSecret) {
            headers['Authorization'] = `Service ${serviceSecret}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(`${base}/api/v1/sync`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    talentId,
                    data: {
                        ratingScore: newRating,
                    },
                }),
                signal: controller.signal,
            });
            if (!res.ok) {
                console.warn(`[RatingService] Search index sync warning: HTTP ${res.status}`);
            }
        }
        catch (err) {
            console.warn('[RatingService] Search index sync warning:', err?.message || err);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.RatingService = RatingService;
