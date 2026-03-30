import { Router } from 'express';
import { RatingController } from '../controllers/rating.controller';
import { validate } from '../middleware/validation';
import { baseScoreSchema, singleScoreSchema } from '../middleware/schemas';
import { authenticate, authenticateService, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();
const ratingController = new RatingController();

// Roles allowed to write scores: admin and reviewer
const canWriteRatings = [authenticate, requireRole(UserRole.ADMIN, UserRole.REVIEWER)];

// Internal services can also write ratings directly
const canWriteRatingsOrService = [
    (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization || '';
        // If it's a service call (Bearer service JWT or Service secret), use service auth
        if (authHeader.startsWith('Service ')) {
            return authenticateService(req, res, next);
        }
        // Otherwise validate as a normal user with role guard
        authenticate(req, res, () => requireRole(UserRole.ADMIN, UserRole.REVIEWER)(req, res, next));
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
router.get(
    '/v1/talent/:talentId/rating',
    authenticate,
    ratingController.getTalentRating
);

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
router.post(
    '/v1/ratings/update/:talentId',
    ...canWriteRatingsOrService,
    validate(baseScoreSchema),
    ratingController.updateTalentRating
);

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
router.post(
    '/v1/ratings/update/:talentId/interview-score',
    ...canWriteRatingsOrService,
    validate(singleScoreSchema),
    ratingController.updateInterviewScore
);

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
router.post(
    '/v1/ratings/update/:talentId/family-tree-score',
    ...canWriteRatingsOrService,
    validate(singleScoreSchema),
    ratingController.updateFamilyTreeScore
);

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
router.post(
    '/v1/ratings/update/:talentId/assessment-score',
    ...canWriteRatingsOrService,
    validate(singleScoreSchema),
    ratingController.updateAssessmentScore
);

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
router.post(
    '/v1/ratings/update/:talentId/profile-quality-score',
    ...canWriteRatingsOrService,
    validate(singleScoreSchema),
    ratingController.updateProfileQualityScore
);

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
router.post(
    '/v1/ratings/update/:talentId/spotlight-performance-score',
    ...canWriteRatingsOrService,
    validate(singleScoreSchema),
    ratingController.updateSpotlightPerformanceScore
);

export default router;
