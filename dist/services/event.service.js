"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const database_1 = require("../config/database");
const rating_service_1 = require("./rating.service");
const events_1 = require("../types/events");
const ratingService = new rating_service_1.RatingService();
/**
 * Maps an event type to a BaseScoreInput with only the relevant
 * score field populated and the rest zeroed out.
 */
function mapEventToScores(eventType, payload) {
    switch (eventType) {
        case events_1.ActivityEventType.INTERVIEW_COMPLETED:
            return { interviewScore: payload.score };
        case events_1.ActivityEventType.ASSESSMENT_COMPLETED:
            return { assessmentScore: payload.score };
        case events_1.ActivityEventType.PROFILE_UPDATED:
            return { profileQualityScore: payload.score };
        case events_1.ActivityEventType.SPOTLIGHT_POSTED:
            return { spotlightPerformanceScore: payload.score };
        case events_1.ActivityEventType.FAMILY_TREE_UPDATED:
            return { familyTreeScore: payload.score };
        default:
            throw new Error(`Unknown event type: ${eventType}`);
    }
}
/** Converts a DB row to an ActivityEvent object */
function rowToEvent(row) {
    return {
        eventId: row.event_id,
        talentId: row.talent_id,
        eventType: row.event_type,
        sourceService: row.source_service,
        payload: row.payload,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at),
        processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
}
class EventService {
    /**
     * Receives a new activity event from another service:
     * 1. Persists it to activity_events table (status = pending)
     * 2. Immediately processes it to update the talent's rating
     * 3. Marks it as processed (or failed)
     * Returns the final event record.
     */
    async receiveEvent(dto) {
        // 1. Insert event as pending
        const insertResult = await database_1.pool.query(`INSERT INTO activity_events
         (talent_id, event_type, source_service, payload, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            dto.talentId,
            dto.eventType,
            dto.sourceService,
            JSON.stringify(dto.payload),
            events_1.EventStatus.PENDING,
        ]);
        const event = rowToEvent(insertResult.rows[0]);
        // 2. Process immediately
        try {
            const scores = mapEventToScores(dto.eventType, dto.payload);
            await ratingService.updateTalentRating(dto.talentId, scores);
            // 3a. Mark as processed
            await database_1.pool.query(`UPDATE activity_events
            SET status = $1, processed_at = NOW()
          WHERE event_id = $2`, [events_1.EventStatus.PROCESSED, event.eventId]);
            return { ...event, status: events_1.EventStatus.PROCESSED, processedAt: new Date() };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            // 3b. Mark as failed with error detail
            await database_1.pool.query(`UPDATE activity_events
            SET status = $1, error_message = $2, processed_at = NOW()
          WHERE event_id = $3`, [events_1.EventStatus.FAILED, errorMessage, event.eventId]);
            throw err; // re-throw so the controller returns 500
        }
    }
    /**
     * Returns the full event log for a talent, newest first.
     */
    async getEventHistory(talentId) {
        const { rows } = await database_1.pool.query(`SELECT * FROM activity_events
        WHERE talent_id = $1
        ORDER BY created_at DESC`, [talentId]);
        return rows.map(rowToEvent);
    }
    /**
     * Returns all failed events across all talents (useful for ops/debugging).
     */
    async getFailedEvents() {
        const { rows } = await database_1.pool.query(`SELECT * FROM activity_events
        WHERE status = $1
        ORDER BY created_at DESC`, [events_1.EventStatus.FAILED]);
        return rows.map(rowToEvent);
    }
    /**
     * Retry a previously failed event by its ID.
     */
    async retryEvent(eventId) {
        const { rows } = await database_1.pool.query(`SELECT * FROM activity_events WHERE event_id = $1`, [eventId]);
        if (!rows.length)
            throw new Error(`Event ${eventId} not found`);
        const event = rowToEvent(rows[0]);
        if (event.status !== events_1.EventStatus.FAILED) {
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
exports.EventService = EventService;
