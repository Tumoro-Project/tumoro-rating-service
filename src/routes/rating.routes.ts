
import { Router } from 'express';
import { RatingController } from '../controllers/rating.controller';
import { validate } from '../middleware/validation';
import { baseScoreSchema, singleScoreSchema } from '../middleware/schemas';

const router = Router();
const ratingController = new RatingController();


/**
 * @swagger
 * /v1/talent/{talentId}/rating:
 *   get:
 *     summary: Get talent rating
 *     description: Retrieve the rating of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to retrieve the rating for.
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeHistory
 *         required: false
 *         description: Whether to include the talent's rating history.
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: The talent's rating.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TalentState'
 */
router.get('/v1/talent/:talentId/rating', ratingController.getTalentRating);



/**
 * @swagger
 * /v1/ratings/update/{talentId}:
 *   post:
 *     summary: Update talent rating
 *     description: Update the rating of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the rating for.
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
 */
router.post('/v1/ratings/update/:talentId', validate(baseScoreSchema), ratingController.updateTalentRating);



/**
 * @swagger
 * /v1/ratings/update/{talentId}/interview-score:
 *   post:
 *     summary: Update interview score
 *     description: Update the interview score of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the score for.
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
router.post('/v1/ratings/update/:talentId/interview-score', validate(singleScoreSchema), ratingController.updateInterviewScore);



/**
 * @swagger
 * /v1/ratings/update/{talentId}/family-tree-score:
 *   post:
 *     summary: Update family tree score
 *     description: Update the family tree score of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the score for.
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
router.post('/v1/ratings/update/:talentId/family-tree-score', validate(singleScoreSchema), ratingController.updateFamilyTreeScore);



/**
 * @swagger
 * /v1/ratings/update/{talentId}/assessment-score:
 *   post:
 *     summary: Update assessment score
 *     description: Update the assessment score of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the score for.
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
router.post('/v1/ratings/update/:talentId/assessment-score', validate(singleScoreSchema), ratingController.updateAssessmentScore);



/**
 * @swagger
 * /v1/ratings/update/{talentId}/profile-quality-score:
 *   post:
 *     summary: Update profile quality score
 *     description: Update the profile quality score of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the score for.
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
router.post('/v1/ratings/update/:talentId/profile-quality-score', validate(singleScoreSchema), ratingController.updateProfileQualityScore);



/**
 * @swagger
 * /v1/ratings/update/{talentId}/spotlight-performance-score:
 *   post:
 *     summary: Update spotlight performance score
 *     description: Update the spotlight performance score of a talent with a given ID.
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         description: ID of the talent to update the score for.
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
router.post('/v1/ratings/update/:talentId/spotlight-performance-score', validate(singleScoreSchema), ratingController.updateSpotlightPerformanceScore);


export default router;
