"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingController = void 0;
const rating_service_1 = require("../services/rating.service");
const rating_helpers_1 = require("../utilities/rating.helpers");
const ratingService = new rating_service_1.RatingService();
class RatingController {
    /**
     * GET /v1/talent/:talentId/rating
     * Returns current rating state, optionally including full history.
     */
    async getTalentRating(req, res) {
        try {
            const talentId = req.params.talentId;
            const talentState = await ratingService.getTalentState(talentId);
            if (req.query.includeHistory === 'true') {
                const ratingHistory = await ratingService.getRatingHistory(talentId);
                res.status(200).json({ ...talentState, ratingHistory });
            }
            else {
                res.status(200).json(talentState);
            }
        }
        catch (err) {
            console.error('getTalentRating error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * GET /v1/ratings/trending
     * Returns the fastest growing talent based on momentum score.
     */
    async getTrendingTalent(req, res) {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const trending = await ratingService.getTrendingTalent(limit);
            res.status(200).json({ results: trending });
        }
        catch (err) {
            console.error('getTrendingTalent error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId
     * Updates all score components at once.
     */
    async updateTalentRating(req, res) {
        try {
            const talentId = req.params.talentId;
            const inputScores = req.body;
            const newTalentState = await ratingService.updateTalentRating(talentId, inputScores);
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateTalentRating error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId/interview-score
     */
    async updateInterviewScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score } = req.body;
            const newTalentState = await ratingService.updateInterviewScore(talentId, score);
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateInterviewScore error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId/family-tree-score
     * Supports updating via:
     *  - { score } (0–10 Lineage Score or 0–100 raw points)
     *  - { rawPoints } (0–100 raw questionnaire points)
     *  - { answers } (weighted 10-question Family History Commitment Questionnaire answers)
     */
    async updateFamilyTreeScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score, rawPoints, answers, mode } = req.body;
            let resolvedScore = 0;
            if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
                const computed = (0, rating_helpers_1.calculateFamilyHistoryQuestionnaireScore)(answers);
                resolvedScore = computed.scoreOutOf10;
            }
            else if (typeof rawPoints === 'number') {
                resolvedScore = (0, rating_helpers_1.normalizeFamilyTreeScore)(rawPoints);
            }
            else if (typeof score === 'number') {
                resolvedScore = (0, rating_helpers_1.normalizeFamilyTreeScore)(score);
            }
            const newTalentState = await ratingService.updateFamilyTreeScore(talentId, resolvedScore, mode ?? 'set');
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateFamilyTreeScore error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId/assessment-score
     */
    async updateAssessmentScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score } = req.body;
            const newTalentState = await ratingService.updateAssessmentScore(talentId, score);
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateAssessmentScore error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId/profile-quality-score
     */
    async updateProfileQualityScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score } = req.body;
            const newTalentState = await ratingService.updateProfileQualityScore(talentId, score);
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateProfileQualityScore error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/ratings/update/:talentId/spotlight-performance-score
     */
    async updateSpotlightPerformanceScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score } = req.body;
            const newTalentState = await ratingService.updateSpotlightPerformanceScore(talentId, score);
            res.status(200).json(newTalentState);
        }
        catch (err) {
            console.error('updateSpotlightPerformanceScore error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * POST /v1/character-ratings
     */
    async submitCharacterRating(req, res) {
        try {
            const raterId = req.user?.userId;
            if (!raterId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const result = await ratingService.submitCharacterRating(raterId, req.body);
            res.status(200).json(result);
        }
        catch (err) {
            if (err?.statusCode === 400) {
                res.status(400).json({ message: err.message });
                return;
            }
            console.error('submitCharacterRating error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * GET /v1/talent/:talentId/character-breakdown
     */
    async getCharacterBreakdown(req, res) {
        try {
            const talentId = req.params.talentId;
            const viewerId = req.user?.userId;
            const breakdown = await ratingService.getCharacterBreakdown(talentId, viewerId);
            res.status(200).json(breakdown);
        }
        catch (err) {
            console.error('getCharacterBreakdown error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.RatingController = RatingController;
