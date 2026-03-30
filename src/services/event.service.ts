import { pool } from '../config/database';
import { RatingService } from './rating.service';
import {
    ActivityEvent,
    ActivityEventPayload,
    ActivityEventType,
    CreateEventDto,
    EventStatus,
} from '../types/events';
import { BaseScoreInput } from '../models/IDataModels';

const ratingService = new RatingService();

/**
 * Maps an event type to a BaseScoreInput with only the relevant
 * score field populated and the rest zeroed out.
 */
function mapEventToScores(
    eventType: ActivityEventType,
    payload: ActivityEventPayload
): BaseScoreInput {
    switch (eventType) {
        case ActivityEventType.INTERVIEW_COMPLETED:
            return { interviewScore: payload.score };

        case ActivityEventType.ASSESSMENT_COMPLETED:
            return { assessmentScore: payload.score };

        case ActivityEventType.PROFILE_UPDATED:
            return { profileQualityScore: payload.score };

        case ActivityEventType.SPOTLIGHT_POSTED:
            return { spotlightPerformanceScore: payload.score };

        case ActivityEventType.FAMILY_TREE_UPDATED:
            return { familyTreeScore: payload.score };

        default:
            throw new Error(`Unknown event type: ${eventType}`);
    }
}

/** Converts a DB row to an ActivityEvent object */
function rowToEvent(row: Record<string, unknown>): ActivityEvent {
    return {
        eventId: row.event_id as string,
        talentId: row.talent_id as string,
        eventType: row.event_type as ActivityEventType,
        sourceService: row.source_service as string,
        payload: row.payload as ActivityEventPayload,
        status: row.status as EventStatus,
        errorMessage: row.error_message as string | undefined,
        createdAt: new Date(row.created_at as string),
        processedAt: row.processed_at ? new Date(row.processed_at as string) : undefined,
    };
}

export class EventService {
    /**
     * Receives a new activity event from another service:
     * 1. Persists it to activity_events table (status = pending)
     * 2. Immediately processes it to update the talent's rating
     * 3. Marks it as processed (or failed)
     * Returns the final event record.
     */
    async receiveEvent(dto: CreateEventDto): Promise<ActivityEvent> {
        // 1. Insert event as pending
        const insertResult = await pool.query(
            `INSERT INTO activity_events
         (talent_id, event_type, source_service, payload, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [
                dto.talentId,
                dto.eventType,
                dto.sourceService,
                JSON.stringify(dto.payload),
                EventStatus.PENDING,
            ]
        );

        const event = rowToEvent(insertResult.rows[0]);

        // 2. Process immediately
        try {
            const scores = mapEventToScores(dto.eventType, dto.payload);
            await ratingService.updateTalentRating(dto.talentId, scores);

            // 3a. Mark as processed
            await pool.query(
                `UPDATE activity_events
            SET status = $1, processed_at = NOW()
          WHERE event_id = $2`,
                [EventStatus.PROCESSED, event.eventId]
            );

            return { ...event, status: EventStatus.PROCESSED, processedAt: new Date() };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';

            // 3b. Mark as failed with error detail
            await pool.query(
                `UPDATE activity_events
            SET status = $1, error_message = $2, processed_at = NOW()
          WHERE event_id = $3`,
                [EventStatus.FAILED, errorMessage, event.eventId]
            );

            throw err; // re-throw so the controller returns 500
        }
    }

    /**
     * Returns the full event log for a talent, newest first.
     */
    async getEventHistory(talentId: string): Promise<ActivityEvent[]> {
        const { rows } = await pool.query(
            `SELECT * FROM activity_events
        WHERE talent_id = $1
        ORDER BY created_at DESC`,
            [talentId]
        );
        return rows.map(rowToEvent);
    }

    /**
     * Returns all failed events across all talents (useful for ops/debugging).
     */
    async getFailedEvents(): Promise<ActivityEvent[]> {
        const { rows } = await pool.query(
            `SELECT * FROM activity_events
        WHERE status = $1
        ORDER BY created_at DESC`,
            [EventStatus.FAILED]
        );
        return rows.map(rowToEvent);
    }

    /**
     * Retry a previously failed event by its ID.
     */
    async retryEvent(eventId: string): Promise<ActivityEvent> {
        const { rows } = await pool.query(
            `SELECT * FROM activity_events WHERE event_id = $1`,
            [eventId]
        );

        if (!rows.length) throw new Error(`Event ${eventId} not found`);

        const event = rowToEvent(rows[0]);
        if (event.status !== EventStatus.FAILED) {
            throw new Error(`Event ${eventId} is not in a failed state (status: ${event.status})`);
        }

        // Re-process
        return this.receiveEvent({
            talentId: event.talentId,
            eventType: event.eventType,
            sourceService: event.sourceService,
            payload: event.payload,
        });
    }
}
