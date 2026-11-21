import { RatingService } from '../rating.service';
import { pool } from '../../config/database';
import { characterRatingSchema } from '../../middleware/schemas';

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('RatingService - Character Ratings', () => {
  let service: RatingService;

  const sampleTalentRow = {
    talent_id: 'talent-123',
    current_rating: '0',
    current_k_factor: '1.0',
    engagement_count: '0',
    interview_score: '0',
    family_tree_score: '0',
    assessment_score: '0',
    profile_quality_score: '0',
    spotlight_performance_score: '0',
    last_updated: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RatingService();
  });

  describe('characterRatingSchema validation', () => {
    it('accepts valid 1-5 dimension scores and relationships', () => {
      const res = characterRatingSchema.safeParse({
        talentId: 'talent-123',
        integrity: 5,
        consistency: 4,
        investmentInOthers: 5,
        longTermThinking: 4,
        honesty: 5,
        raterRelationship: 'COLLEAGUE',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.anonymous).toBe(true);
      }
    });

    it('rejects out-of-range scores or invalid relationships', () => {
      const res = characterRatingSchema.safeParse({
        talentId: 'talent-123',
        integrity: 6,
        consistency: 0,
        investmentInOthers: 3,
        longTermThinking: 3,
        honesty: 3,
        raterRelationship: 'FRIEND',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('submitCharacterRating', () => {
    it('blocks self-rating with statusCode 400', async () => {
      await expect(
        service.submitCharacterRating('talent-123', {
          talentId: 'talent-123',
          integrity: 5,
          consistency: 5,
          investmentInOthers: 5,
          longTermThinking: 5,
          honesty: 5,
          raterRelationship: 'COLLEAGUE',
          anonymous: true,
        })
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('upserts character_ratings and updates talent_states.character_score without changing current_rating', async () => {
      (pool.query as jest.Mock)
        // getTalentState UPSERT
        .mockResolvedValueOnce({ rows: [sampleTalentRow] })
        // INSERT INTO character_ratings ON CONFLICT
        .mockResolvedValueOnce({ rows: [] })
        // SELECT AVG / COUNT aggregate
        .mockResolvedValueOnce({ rows: [{ total_count: 3, avg_score: 4.4 }] })
        // UPDATE talent_states SET character_score
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.submitCharacterRating('rater-999', {
        talentId: 'talent-123',
        integrity: 5,
        consistency: 4,
        investmentInOthers: 5,
        longTermThinking: 4,
        honesty: 4,
        raterRelationship: 'PROFESSIONAL',
        anonymous: true,
      });

      expect(result).toEqual({
        success: true,
        message: 'Character rating saved',
        newCharacterScore: 4.4,
        totalCount: 3,
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE talent_states'),
        [4.4, 'talent-123']
      );
      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('current_rating ='),
        expect.anything()
      );
    });
  });

  describe('getCharacterBreakdown', () => {
    it('keeps dimension averages zeroed when totalCount < 5 while returning viewer state', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              total_count: 3,
              avg_integrity: 4.6,
              avg_consistency: 4.3,
              avg_investment: 4.0,
              avg_long_term: 4.2,
              avg_honesty: 4.8,
              rel_professional: 1,
              rel_colleague: 2,
              rel_community: 0,
              rel_mentor: 0,
              recent_count: 3,
              recent_avg: 4.38,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              integrity: 5,
              consistency: 4,
              investment_in_others: 4,
              long_term_thinking: 4,
              honesty: 5,
              rater_relationship: 'COLLEAGUE',
              anonymous: true,
            },
          ],
        });

      const breakdown = await service.getCharacterBreakdown('talent-123', 'rater-999');

      expect(breakdown.totalCount).toBe(3);
      expect(breakdown.publicScore).toBe(false);
      expect(breakdown.averages).toEqual({
        integrity: 0,
        consistency: 0,
        investmentInOthers: 0,
        longTermThinking: 0,
        honesty: 0,
      });
      expect(breakdown.hasCharacterMomentum).toBe(true);
      expect(breakdown.viewerHasRated).toBe(true);
      expect(breakdown.viewerRating).toEqual({
        integrity: 5,
        consistency: 4,
        investmentInOthers: 4,
        longTermThinking: 4,
        honesty: 5,
        raterRelationship: 'COLLEAGUE',
        anonymous: true,
      });
    });

    it('exposes rounded dimension averages once totalCount >= 5', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            total_count: 5,
            avg_integrity: 4.6666,
            avg_consistency: 4.2,
            avg_investment: 4.4,
            avg_long_term: 4.0,
            avg_honesty: 4.8,
            rel_professional: 2,
            rel_colleague: 2,
            rel_community: 1,
            rel_mentor: 0,
            recent_count: 5,
            recent_avg: 4.41,
          },
        ],
      });

      const breakdown = await service.getCharacterBreakdown('talent-123');

      expect(breakdown.totalCount).toBe(5);
      expect(breakdown.publicScore).toBe(true);
      expect(breakdown.averages).toEqual({
        integrity: 4.67,
        consistency: 4.2,
        investmentInOthers: 4.4,
        longTermThinking: 4.0,
        honesty: 4.8,
      });
      expect(breakdown.viewerHasRated).toBeUndefined();
    });
  });
});
