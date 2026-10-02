import { Router, Request, Response, NextFunction } from 'express';
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
    (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization || '';
        // If it's a service call (Bearer service JWT or Service secret), use service auth
        if (authHeader.startsWith('Service ')) {
            return authenticateService(req, res, next);
        }
        // Otherwise validate as a normal user with role guard
        authenticate(req as any, res, () => requireRole(UserRole.ADMIN, UserRole.REVIEWER)(req as any, res, next));
    },
];

// Talents can update their own family tree score; admins, reviewers, and internal services can also update
const canUpdateFamilyTreeOrService = [
    (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Service ')) {
            return authenticateService(req, res, next);
        }
        authenticate(req as any, res, () => {
            const user = (req as any).user;
            const talentId = req.params.talentId;
            if (user?.userId === talentId || user?.role === UserRole.ADMIN || user?.role === UserRole.REVIEWER) {
                return next();
            }
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        });
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

router.get(
    '/v1/talent/:talentId/character-breakdown',
    ratingController.getCharacterBreakdown
);

/**
 * @swagger
 * /v1/ratings/trending:
 *   get:
 *     summary: Get trending talent
 *     description: Returns the fastest growing talent based on momentum score for the week.
 *     responses:
 *       200:
 *         description: List of trending talent.
 */
router.get(
    '/v1/ratings/trending',
    authenticate,
    ratingController.getTrendingTalent
);

/**
 * @swagger
 * /v1/ratings/update/{talentId}:
 *   post:
 *     summary: Update talent rating (all scores)
 *     description: Update the full rating of a talent. Requires admin or reviewer role, or a trusted service call.
 *     security:
 *       - serviceAuth: []
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
 *       - serviceAuth: []
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
 *       - serviceAuth: []
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
    ...canUpdateFamilyTreeOrService,
    validate(singleScoreSchema),
    ratingController.updateFamilyTreeScore
);

/**
 * @swagger
 * /v1/ratings/update/{talentId}/assessment-score:
 *   post:
 *     summary: Update assessment score
 *     security:
 *       - serviceAuth: []
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
 *       - serviceAuth: []
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
 *       - serviceAuth: []
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
