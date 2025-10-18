
import { Router } from 'express';
import { RatingController } from '../controllers/rating.controller';
import { validate } from '../middleware/validation';
import { baseScoreSchema, singleScoreSchema } from '../middleware/schemas';

const router = Router();
const ratingController = new RatingController();

router.get('/v1/talent/:talentId/rating', ratingController.getTalentRating);

router.post('/v1/ratings/update/:talentId', validate(baseScoreSchema), ratingController.updateTalentRating);

router.post('/v1/ratings/update/:talentId/interview-score', validate(singleScoreSchema), ratingController.updateInterviewScore);

router.post('/v1/ratings/update/:talentId/family-tree-score', validate(singleScoreSchema), ratingController.updateFamilyTreeScore);

router.post('/v1/ratings/update/:talentId/assessment-score', validate(singleScoreSchema), ratingController.updateAssessmentScore);

router.post('/v1/ratings/update/:talentId/profile-quality-score', validate(singleScoreSchema), ratingController.updateProfileQualityScore);

router.post('/v1/ratings/update/:talentId/spotlight-performance-score', validate(singleScoreSchema), ratingController.updateSpotlightPerformanceScore);

export default router;
