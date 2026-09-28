import { RatingService } from '../rating.service';
import { pool } from '../../config/database';

jest.mock('../../config/database', () => {
  return {
    pool: {
      query: jest.fn(),
      connect: jest.fn(),
    },
  };
});

describe('Rating Service - RatingService Unit Tests', () => {
  let service: RatingService;
  let mockClient: {
    query: jest.Mock;
    release: jest.Mock;
  };

  const sampleTalentRow = {
    talent_id: 'talent-123',
    current_rating: '400',
    current_k_factor: '1.0',
    engagement_count: '0',
    interview_score: '100',
    family_tree_score: '0',
    assessment_score: '100',
    profile_quality_score: '100',
    spotlight_performance_score: '100',
    last_updated: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RatingService();

    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('getTalentState', () => {
    it('should return talent state when upsert returns a row', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [sampleTalentRow],
      });

      const state = await service.getTalentState('talent-123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO talent_states'),
        expect.arrayContaining(['talent-123', 400, 1.0, 0])
      );
      expect(state.talentId).toBe('talent-123');
      expect(state.currentRating).toBe(400);
      expect(state.currentKFactor).toBe(1.0);
      expect(state.engagementCount).toBe(0);
      expect(state.lastInputScores.interviewScore).toBe(100);
    });

    it('should select existing row if UPSERT returns empty (conflict)', async () => {
      // First call (UPSERT DO NOTHING) returns no rows
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        // Second call (SELECT) returns the existing record
        .mockResolvedValueOnce({ rows: [sampleTalentRow] });

      const state = await service.getTalentState('talent-123');

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('SELECT * FROM talent_states'),
        ['talent-123']
      );
      expect(state.talentId).toBe('talent-123');
      expect(state.currentRating).toBe(400);
    });
  });

  describe('getRatingHistory', () => {
    it('should map database rows to RatingEntry list', async () => {
      const mockEntryRow = {
        entry_id: 'entry-1',
        talent_id: 'talent-123',
        timestamp: '2026-02-01T12:00:00Z',
        previous_rating: '400',
        new_rating: '425',
        k_factor_used: '1.0',
        new_engagement_count: '1',
        input_interview_score: '8.0',
        input_family_tree_score: '0',
        input_assessment_score: '0',
        input_profile_quality_score: '0',
        input_spotlight_performance_score: '0',
        current_interview_score: '121.4',
        current_family_tree_score: '0',
        current_assessment_score: '100',
        current_profile_quality_score: '100',
        current_spotlight_performance_score: '100',
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockEntryRow],
      });

      const history = await service.getRatingHistory('talent-123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM rating_entries'),
        ['talent-123']
      );
      expect(history.length).toBe(1);
      expect(history[0].entryId).toBe('entry-1');
      expect(history[0].previousRating).toBe(400);
      expect(history[0].newRating).toBe(425);
    });
  });

  describe('recalculateRating flow (updateInterviewScore & updateTalentRating)', () => {
    it('should apply signed delta, update state in transaction and commit', async () => {
      // Mock getTalentState
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [sampleTalentRow],
      });

      const updatedState = await service.updateInterviewScore('talent-123', 10);

      // Verify transaction management
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE talent_states SET'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rating_entries'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Interview delta for 10/10 with maxAbs=30:
      // (10 - 3) / 7 * 30 = 30.
      // previous interview was 100 -> new is 130
      // new rating = 130 + 0 + 100 + 100 + 100 = 430
      expect(updatedState.currentRating).toBe(430);
      expect(updatedState.engagementCount).toBe(1);
    });

    it('should rollback transaction and release client if query fails', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [sampleTalentRow],
      });

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE talent_states')) {
          return Promise.reject(new Error('DB failure'));
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(service.updateInterviewScore('talent-123', 5)).rejects.toThrow('DB failure');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
