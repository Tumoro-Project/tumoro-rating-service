import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticateService } from '../middleware/auth.middleware';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();
const eventController = new EventController();

/**
 * All /internal routes are protected by service-to-service authentication.
 * Only trusted microservices (using SERVICE_SECRET) can call these.
 *
 * Admins can also access read-only routes (getEventHistory, getFailedEvents).
 */

// ─── Write: Service auth only ─────────────────────────────────────────────

/**
 * @swagger
 * /internal/events:
 *   post:
 *     summary: Receive activity event
 *     description: Called by other services to emit an activity event that triggers a rating update.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventDto'
 *     responses:
 *       200:
 *         description: Event received and processing started.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: 'string' }
 *                 eventId: { type: 'string' }
 */
router.post('/internal/events', authenticateService, (req, res) =>
    eventController.receiveEvent(req, res)
);

/**
 * @swagger
 * /internal/events/{eventId}/retry:
 *   post:
 *     summary: Retry a failed event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event retry initiated.
 */
router.post('/internal/events/:eventId/retry', authenticateService, (req, res) =>
    eventController.retryEvent(req, res)
);

// ─── Read: Admin user OR service auth ────────────────────────────────────

/**
 * @swagger
 * /internal/events/{talentId}:
 *   get:
 *     summary: Get event history for a talent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of events for the talent.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActivityEvent'
 */
router.get(
    '/internal/events/:talentId',
    (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Service ')) {
            return authenticateService(req, res, next);
        }
        authenticate(req, res, () =>
            requireRole(UserRole.ADMIN)(req, res, next)
        );
    },
    (req, res) => eventController.getEventHistory(req, res)
);

/**
 * @swagger
 * /internal/events/failed:
 *   get:
 *     summary: Get all failed events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of failed events.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActivityEvent'
 */
router.get(
    '/internal/events/failed',
    (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Service ')) {
            return authenticateService(req, res, next);
        }
        authenticate(req, res, () =>
            requireRole(UserRole.ADMIN)(req, res, next)
        );
    },
    (req, res) => eventController.getFailedEvents(req, res)
);

export default router;
