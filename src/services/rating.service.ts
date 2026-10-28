import { QueryResultRow } from 'pg';
import { TalentState, RatingEntry, BaseScoreInput } from '../models/IDataModels';
import { determineKFactor, normalizeFamilyTreeScore } from '../utilities/rating.helpers';
import { pool } from '../config/database';

// Default accumulated scores for a brand-new talent
const DEFAULT_SCORES: BaseScoreInput = {
  interviewScore: 75,
  familyTreeScore: 0,
  assessmentScore: 75,
  profileQualityScore: 0,
  spotlightPerformanceScore: 0,
};

const DEFAULT_RATING = 350; // sum of defaults above

export class RatingService {
  // ─── Helpers ──────────────────────────────────────────────────────────────

  private rowToTalentState(row: Record<string, unknown>): TalentState {
    return {
      talentId: row.talent_id as string,
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
      lastUpdated: new Date(row.last_updated as string),
    };
  }

  private rowToRatingEntry(row: Record<string, unknown>): RatingEntry {
    return {
      entryId: row.entry_id as string,
      talentId: row.talent_id as string,
      timestamp: new Date(row.timestamp as string),
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

  private convertToSigned(score: number, maxAbs: number): number {
    const s = Math.max(0, Math.min(10, score));
    if (s <= 3) return (s / 3) * maxAbs - maxAbs;
    return ((s - 3) / 7) * maxAbs;
  }

  private getRatingTotal(scores: BaseScoreInput): number {
    const rawFamily = scores.familyTreeScore || 0;
    // Family Tree Lineage Score is 0–10. Without family tree connected, it contributes strictly 0.
    // When connected (0–10), it contributes up to +200 points on 1000 scale (+2.00 on 10 scale).
    const familyOutOf10 = rawFamily > 10 ? rawFamily / 10 : rawFamily;
    const familyRatingContribution = Math.round(Math.max(0, Math.min(10, familyOutOf10)) * 20);

    const interview = Math.max(0, Math.min(150, scores.interviewScore ?? 75));
    const assessment = Math.max(0, Math.min(150, scores.assessmentScore ?? 75));
    const profile = Math.max(0, Math.min(300, scores.profileQualityScore ?? 0));
    const spotlight = Math.max(0, Math.min(100, scores.spotlightPerformanceScore ?? 0));

    // Foundation Base = 200 (2.00 on 10 scale)
    const total = 200 + profile + familyRatingContribution + interview + assessment + spotlight;
    return Math.min(1000, Math.max(100, total));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Fetches the talent's current state from the DB.
   * If the talent doesn't exist, creates a default record (UPSERT).
   */
  public async getTalentState(talentId: string): Promise<TalentState> {
    // UPSERT: insert default row if not present, then return current row
    const { rows } = await pool.query(
      `INSERT INTO talent_states (
          talent_id, current_rating, current_k_factor, engagement_count,
          interview_score, family_tree_score, assessment_score,
          profile_quality_score, spotlight_performance_score, last_updated
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (talent_id) DO NOTHING
       RETURNING *`,
      [
        talentId,
        DEFAULT_RATING,
        1.0,
        0,
        DEFAULT_SCORES.interviewScore,
        DEFAULT_SCORES.familyTreeScore,
        DEFAULT_SCORES.assessmentScore,
        DEFAULT_SCORES.profileQualityScore,
        DEFAULT_SCORES.spotlightPerformanceScore,
      ]
    );

    if (rows.length > 0) return this.rowToTalentState(rows[0]);

    // Row already existed — fetch it
    const existing = await pool.query(
      `SELECT * FROM talent_states WHERE talent_id = $1`,
      [talentId]
    );
    return this.rowToTalentState(existing.rows[0]);
  }

  /**
   * Returns the full rating history for a talent, newest first.
   */
  public async getRatingHistory(talentId: string): Promise<RatingEntry[]> {
    const { rows } = await pool.query(
      `SELECT * FROM rating_entries WHERE talent_id = $1 ORDER BY timestamp DESC`,
      [talentId]
    );
    return rows.map((r: QueryResultRow) => this.rowToRatingEntry(r));
  }

  /**
   * Returns the fastest growing talent (Momentum) for the week.
   * Momentum = (Rating Delta over 7 days) * (Engagement Count over 7 days) / K_factor
   */
  public async getTrendingTalent(limit: number = 10): Promise<any[]> {
    const { rows } = await pool.query(
      `WITH weekly_deltas AS (
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
      LIMIT $1`,
      [limit]
    );
    return rows;
  }

  /**
   * Updates all score components at once.
   */
  public async updateTalentRating(
    talentId: string,
    inputScores: BaseScoreInput
  ): Promise<TalentState> {
    return this.recalculateRating(talentId, inputScores);
  }

  public async updateInterviewScore(talentId: string, score: number): Promise<TalentState> {
    return this.recalculateRating(talentId, { interviewScore: score });
  }

  public async updateFamilyTreeScore(
    talentId: string,
    score: number,
    mode: 'set' | 'delta' = 'set'
  ): Promise<TalentState> {
    return this.recalculateRating(
      talentId,
      { familyTreeScore: normalizeFamilyTreeScore(score) },
      { familyTreeMode: mode }
    );
  }

  public async updateAssessmentScore(talentId: string, score: number): Promise<TalentState> {
    return this.recalculateRating(talentId, { assessmentScore: score });
  }

  public async updateProfileQualityScore(talentId: string, score: number): Promise<TalentState> {
    return this.recalculateRating(talentId, { profileQualityScore: score });
  }

  public async updateSpotlightPerformanceScore(talentId: string, score: number): Promise<TalentState> {
    return this.recalculateRating(talentId, { spotlightPerformanceScore: score });
  }

  // ─── Core Calculation ─────────────────────────────────────────────────────

  private async recalculateRating(
    talentId: string,
    inputScores: BaseScoreInput,
    options?: { familyTreeMode?: 'set' | 'delta' }
  ): Promise<TalentState> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await this.getTalentState(talentId);
      const prevScores = current.lastInputScores;
      const kFactor = determineKFactor(current.engagementCount);

      // Update profile quality score: if passed as 0-10 scale, convert to 0-300; if passed as 0-300, clamp.
      let nextProfileScore = prevScores.profileQualityScore ?? 0;
      if (inputScores.profileQualityScore !== undefined) {
        const pInput = inputScores.profileQualityScore;
        nextProfileScore = pInput <= 10 ? Math.round(pInput * 30) : Math.min(300, Math.max(0, pInput));
      }

      // Interview and assessment scores: if passed as 0-10 scale, convert to 0-150; if passed as 0-150, clamp.
      let nextInterviewScore = prevScores.interviewScore ?? 75;
      if (inputScores.interviewScore !== undefined) {
        const iInput = inputScores.interviewScore;
        nextInterviewScore = iInput <= 10 ? Math.round(iInput * 15) : Math.min(150, Math.max(0, iInput));
      }

      let nextAssessmentScore = prevScores.assessmentScore ?? 75;
      if (inputScores.assessmentScore !== undefined) {
        const aInput = inputScores.assessmentScore;
        nextAssessmentScore = aInput <= 10 ? Math.round(aInput * 15) : Math.min(150, Math.max(0, aInput));
      }

      let nextSpotlightScore = prevScores.spotlightPerformanceScore ?? 0;
      if (inputScores.spotlightPerformanceScore !== undefined) {
        nextSpotlightScore = Math.min(100, Math.max(0, inputScores.spotlightPerformanceScore));
      }

      let nextFamilyTreeScore = Number((prevScores.familyTreeScore ?? 0).toFixed(2));
      if (inputScores.familyTreeScore !== undefined) {
        const normalizedInput = normalizeFamilyTreeScore(inputScores.familyTreeScore);
        if ((options?.familyTreeMode ?? 'set') === 'set') {
          // Questionnaire score sets/replaces the talent's Lineage Score (0–10), including 0 on reset
          nextFamilyTreeScore = normalizedInput;
        } else {
          // Incremental bonus (e.g. referral completion), clamped to 0–10
          const delta = normalizedInput * kFactor;
          nextFamilyTreeScore = Number(
            Math.min(10, Math.max(0, (prevScores.familyTreeScore ?? 0) + delta)).toFixed(2)
          );
        }
      }

      const newScores: BaseScoreInput = {
        interviewScore: nextInterviewScore,
        assessmentScore: nextAssessmentScore,
        spotlightPerformanceScore: nextSpotlightScore,
        profileQualityScore: nextProfileScore,
        familyTreeScore: nextFamilyTreeScore,
      };

      const newRating = Number(this.getRatingTotal(newScores).toFixed(2));
      const newEngagementCount = current.engagementCount + 1;

      // 1. Update talent_states row
      await client.query(
        `UPDATE talent_states SET
            current_rating              = $1,
            current_k_factor            = $2,
            engagement_count            = $3,
            interview_score             = $4,
            family_tree_score           = $5,
            assessment_score            = $6,
            profile_quality_score       = $7,
            spotlight_performance_score = $8,
            last_updated                = NOW()
          WHERE talent_id = $9`,
        [
          newRating,
          kFactor,
          newEngagementCount,
          newScores.interviewScore,
          newScores.familyTreeScore,
          newScores.assessmentScore,
          newScores.profileQualityScore,
          newScores.spotlightPerformanceScore,
          talentId,
        ]
      );

      // 2. Insert rating_entries audit row
      await client.query(
        `INSERT INTO rating_entries (
            talent_id, previous_rating, new_rating, k_factor_used, new_engagement_count,
            input_interview_score, input_family_tree_score, input_assessment_score,
            input_profile_quality_score, input_spotlight_performance_score,
            current_interview_score, current_family_tree_score, current_assessment_score,
            current_profile_quality_score, current_spotlight_performance_score
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
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
        ]
      );

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
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Propagates rating updates immediately to the search cache and related services.
   */
  private async syncRatingToServices(
    talentId: string,
    newRating: number,
    _scores: BaseScoreInput
  ): Promise<void> {
    const searchUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3005';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      fetch(`${searchUrl}/talents/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentId,
          data: {
            ratingScore: newRating,
          },
        }),
        signal: controller.signal,
      })
        .then(() => clearTimeout(timeoutId))
        .catch((err) => {
          clearTimeout(timeoutId);
          console.warn('[RatingService] Search index sync warning:', err?.message || err);
        });
    } catch {}
  }
}
