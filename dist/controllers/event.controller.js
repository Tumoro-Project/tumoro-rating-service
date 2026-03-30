"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const event_service_1 = require("../services/event.service");
const events_1 = require("../types/events");
const zod_1 = require("zod");
const eventService = new event_service_1.EventService();
// Zod validation schema for incoming events
const createEventSchema = zod_1.z.object({
    talentId: zod_1.z.string().min(1, 'talentId is required'),
    eventType: zod_1.z.nativeEnum(events_1.ActivityEventType, {
        errorMap: () => ({
            message: `eventType must be one of: ${Object.values(events_1.ActivityEventType).join(', ')}`,
        }),
    }),
    sourceService: zod_1.z.string().min(1, 'sourceService is required'),
    payload: zod_1.z.object({
        score: zod_1.z.number().min(0).max(10),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
class EventController {
    /**
     * POST /internal/events
     * Accepts an activity event from a trusted service and processes it into a rating update.
     */
    async receiveEvent(req, res) {
        try {
            const result = createEventSchema.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({
                    message: 'Validation failed',
                    errors: result.error.flatten().fieldErrors,
                });
                return;
            }
            const dto = result.data;
            const event = await eventService.receiveEvent(dto);
            res.status(201).json({
                message: 'Event received and processed successfully',
                event,
            });
        }
        catch (err) {
            console.error('receiveEvent error:', err);
            res.status(500).json({
                message: 'Event processing failed',
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /internal/events/:talentId
     * Returns full event history for a specific talent.
     */
    async getEventHistory(req, res) {
        try {
            const talentId = req.params.talentId;
            const events = await eventService.getEventHistory(talentId);
            res.status(200).json({ talentId, events });
        }
        catch (err) {
            console.error('getEventHistory error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * GET /internal/events/failed
     * Returns all failed events — visible to admins for debugging.
     */
    async getFailedEvents(_req, res) {
        try {
            const events = await eventService.getFailedEvents();
            res.status(200).json({ count: events.length, events });
        }
        catch (err) {
            console.error('getFailedEvents error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /internal/events/:eventId/retry
     * Retries a failed event by its ID.
     */
    async retryEvent(req, res) {
        try {
            const eventId = req.params.eventId;
            const event = await eventService.retryEvent(eventId);
            res.status(200).json({ message: 'Event retried successfully', event });
        }
        catch (err) {
            console.error('retryEvent error:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            res.status(400).json({ message });
        }
    }
}
exports.EventController = EventController;
