import { EventService } from '../event.service';
import { pool } from '../../config/database';
import { RatingService } from '../rating.service';
import { ActivityEventType, EventStatus } from '../../types/events';

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../rating.service');

describe('Rating Service - EventService Unit Tests', () => {
  let eventService: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = new EventService();
  });

  describe('receiveEvent', () => {
    const mockDto = {
      talentId: 'talent-123',
      eventType: ActivityEventType.INTERVIEW_COMPLETED,
      sourceService: 'interview-schedule',
      payload: { score: 8.5 },
    };

    const mockPendingRow = {
      event_id: 'evt-001',
      talent_id: 'talent-123',
      event_type: ActivityEventType.INTERVIEW_COMPLETED,
      source_service: 'interview-schedule',
      payload: { score: 8.5 },
      status: EventStatus.PENDING,
      created_at: '2026-03-01T00:00:00Z',
    };

    it('should save pending event, update talent rating, and mark as processed', async () => {
      (pool.query as jest.Mock)
        // 1. INSERT event
        .mockResolvedValueOnce({ rows: [mockPendingRow] })
        // 2. UPDATE status to PROCESSED
        .mockResolvedValueOnce({ rows: [] });

      (RatingService.prototype.updateTalentRating as jest.Mock).mockResolvedValueOnce({});

      const result = await eventService.receiveEvent(mockDto);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_events'),
        expect.any(Array)
      );
      expect(RatingService.prototype.updateTalentRating).toHaveBeenCalledWith(
        'talent-123',
        { interviewScore: 8.5 }
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE activity_events'),
        [EventStatus.PROCESSED, 'evt-001']
      );
      expect(result.status).toBe(EventStatus.PROCESSED);
    });

    it('should mark event as failed and rethrow if rating update fails', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPendingRow] })
        .mockResolvedValueOnce({ rows: [] });

      (RatingService.prototype.updateTalentRating as jest.Mock).mockRejectedValueOnce(
        new Error('Rating engine error')
      );

      await expect(eventService.receiveEvent(mockDto)).rejects.toThrow('Rating engine error');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE activity_events'),
        [EventStatus.FAILED, 'Rating engine error', 'evt-001']
      );
    });
  });

  describe('getEventHistory', () => {
    it('should return list of activity events for talent', async () => {
      const mockRows = [
        {
          event_id: 'evt-1',
          talent_id: 'talent-123',
          event_type: ActivityEventType.PROFILE_UPDATED,
          source_service: 'user-profile-service',
          payload: { score: 9.0 },
          status: EventStatus.PROCESSED,
          created_at: '2026-03-01T00:00:00Z',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const history = await eventService.getEventHistory('talent-123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM activity_events\s+WHERE talent_id = \$1/),
        ['talent-123']
      );
      expect(history.length).toBe(1);
      expect(history[0].eventId).toBe('evt-1');
      expect(history[0].status).toBe(EventStatus.PROCESSED);
    });
  });

  describe('getFailedEvents', () => {
    it('should return events with status FAILED', async () => {
      const mockRows = [
        {
          event_id: 'evt-failed-1',
          talent_id: 'talent-456',
          event_type: ActivityEventType.ASSESSMENT_COMPLETED,
          source_service: 'assessment-service',
          payload: { score: 5.0 },
          status: EventStatus.FAILED,
          error_message: 'Calculation timeout',
          created_at: '2026-03-01T00:00:00Z',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const failedEvents = await eventService.getFailedEvents();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM activity_events\s+WHERE status = \$1/),
        [EventStatus.FAILED]
      );
      expect(failedEvents.length).toBe(1);
      expect(failedEvents[0].errorMessage).toBe('Calculation timeout');
    });
  });
});
