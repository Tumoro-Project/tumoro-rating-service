"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rating_controller_1 = require("../controllers/rating.controller");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../middleware/schemas");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const ratingController = new rating_controller_1.RatingController();
// Roles allowed to write scores: admin and reviewer
const canWriteRatings = [auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(types_1.UserRole.ADMIN, types_1.UserRole.REVIEWER)];
// Internal services can also write ratings directly
const canWriteRatingsOrService = [
    (req, res, next) => {
        const authHeader = req.headers.authorization || '';
        // If it's a service call (Bearer service JWT or Service secret), use service auth
        if (authHeader.startsWith('Service ')) {
            return (0, auth_middleware_1.authenticateService)(req, res, next);
        }
        // Otherwise validate as a normal user with role guard
        (0, auth_middleware_1.authenticate)(req, res, () => (0, auth_middleware_1.requireRole)(types_1.UserRole.ADMIN, types_1.UserRole.REVIEWER)(req, res, next));
    },
];
/**
 * @swagger
 * /v1/talent/{talentId}/rating:
 *   get:
 *     summary: Get talent rating
 *     description: Retrieve the rating of a talent with a given ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeHistory
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: The talent's rating.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TalentState'
 *       401:
 *         description: Unauthorized
 */
router.get('/v1/talent/:talentId/rating', auth_middleware_1.authenticate, ratingController.getTalentRating);
/**
 * @swagger
 * /v1/ratings/update/{talentId}:
 *   post:
 *     summary: Update talent rating (all scores)
 *     description: Update the full rating of a talent. Requires admin or reviewer role, or a trusted service call.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BaseScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TalentState'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/v1/ratings/update/:talentId', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.baseScoreSchema), ratingController.updateTalentRating);
/**
 * @swagger
 * /v1/ratings/update/{talentId}/interview-score:
 *   post:
 *     summary: Update interview score
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TalentState'
 */
router.post('/v1/ratings/update/:talentId/interview-score', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.singleScoreSchema), ratingController.updateInterviewScore);
/**
 * @swagger
 * /v1/ratings/update/{talentId}/family-tree-score:
 *   post:
 *     summary: Update family tree score
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 */
router.post('/v1/ratings/update/:talentId/family-tree-score', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.singleScoreSchema), ratingController.updateFamilyTreeScore);
/**
 * @swagger
 * /v1/ratings/update/{talentId}/assessment-score:
 *   post:
 *     summary: Update assessment score
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 */
router.post('/v1/ratings/update/:talentId/assessment-score', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.singleScoreSchema), ratingController.updateAssessmentScore);
/**
 * @swagger
 * /v1/ratings/update/{talentId}/profile-quality-score:
 *   post:
 *     summary: Update profile quality score
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 */
router.post('/v1/ratings/update/:talentId/profile-quality-score', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.singleScoreSchema), ratingController.updateProfileQualityScore);
/**
 * @swagger
 * /v1/ratings/update/{talentId}/spotlight-performance-score:
 *   post:
 *     summary: Update spotlight performance score
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleScoreInput'
 *     responses:
 *       200:
 *         description: The updated talent rating.
 */
router.post('/v1/ratings/update/:talentId/spotlight-performance-score', ...canWriteRatingsOrService, (0, validation_1.validate)(schemas_1.singleScoreSchema), ratingController.updateSpotlightPerformanceScore);
exports.default = router;
