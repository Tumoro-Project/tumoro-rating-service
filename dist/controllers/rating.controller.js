"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingController = void 0;
const rating_service_1 = require("../services/rating.service");
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
     */
    async updateFamilyTreeScore(req, res) {
        try {
            const talentId = req.params.talentId;
            const { score } = req.body;
            const newTalentState = await ratingService.updateFamilyTreeScore(talentId, score);
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
}
exports.RatingController = RatingController;
