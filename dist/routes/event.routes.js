"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_middleware_2 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const eventController = new event_controller_1.EventController();
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
 *       - serviceAuth: []
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
router.post('/internal/events', auth_middleware_1.authenticateService, (req, res) => eventController.receiveEvent(req, res));
/**
 * @swagger
 * /internal/events/{eventId}/retry:
 *   post:
 *     summary: Retry a failed event
 *     security:
 *       - serviceAuth: []
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
router.post('/internal/events/:eventId/retry', auth_middleware_1.authenticateService, (req, res) => eventController.retryEvent(req, res));
// ─── Read: Admin user OR service auth ────────────────────────────────────
/**
 * @swagger
 * /internal/events/{talentId}:
 *   get:
 *     summary: Get event history for a talent
 *     security:
 *       - serviceAuth: []
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
router.get('/internal/events/:talentId', (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Service ')) {
        return (0, auth_middleware_1.authenticateService)(req, res, next);
    }
    (0, auth_middleware_2.authenticate)(req, res, () => (0, auth_middleware_2.requireRole)(types_1.UserRole.ADMIN)(req, res, next));
}, (req, res) => eventController.getEventHistory(req, res));
/**
 * @swagger
 * /internal/events/failed:
 *   get:
 *     summary: Get all failed events
 *     security:
 *       - serviceAuth: []
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
router.get('/internal/events/failed', (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Service ')) {
        return (0, auth_middleware_1.authenticateService)(req, res, next);
    }
    (0, auth_middleware_2.authenticate)(req, res, () => (0, auth_middleware_2.requireRole)(types_1.UserRole.ADMIN)(req, res, next));
}, (req, res) => eventController.getFailedEvents(req, res));
exports.default = router;
