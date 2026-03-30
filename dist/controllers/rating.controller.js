"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingController = void 0;
const rating_service_1 = require("../services/rating.service");
const ratingService = new rating_service_1.RatingService();
class RatingController {
    /**
     * GET /v1/talent/:talentId/rating
     * Returns current rating state, optionally including full history.
     */
    getTalentRating(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const talentState = yield ratingService.getTalentState(talentId);
                if (req.query.includeHistory === 'true') {
                    const ratingHistory = yield ratingService.getRatingHistory(talentId);
                    res.status(200).json(Object.assign(Object.assign({}, talentState), { ratingHistory }));
                }
                else {
                    res.status(200).json(talentState);
                }
            }
            catch (err) {
                console.error('getTalentRating error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId
     * Updates all score components at once.
     */
    updateTalentRating(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const inputScores = req.body;
                const newTalentState = yield ratingService.updateTalentRating(talentId, inputScores);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateTalentRating error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId/interview-score
     */
    updateInterviewScore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const { score } = req.body;
                const newTalentState = yield ratingService.updateInterviewScore(talentId, score);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateInterviewScore error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId/family-tree-score
     */
    updateFamilyTreeScore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const { score } = req.body;
                const newTalentState = yield ratingService.updateFamilyTreeScore(talentId, score);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateFamilyTreeScore error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId/assessment-score
     */
    updateAssessmentScore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const { score } = req.body;
                const newTalentState = yield ratingService.updateAssessmentScore(talentId, score);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateAssessmentScore error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId/profile-quality-score
     */
    updateProfileQualityScore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const { score } = req.body;
                const newTalentState = yield ratingService.updateProfileQualityScore(talentId, score);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateProfileQualityScore error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
    /**
     * POST /v1/ratings/update/:talentId/spotlight-performance-score
     */
    updateSpotlightPerformanceScore(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const talentId = req.params.talentId;
                const { score } = req.body;
                const newTalentState = yield ratingService.updateSpotlightPerformanceScore(talentId, score);
                res.status(200).json(newTalentState);
            }
            catch (err) {
                console.error('updateSpotlightPerformanceScore error:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
}
exports.RatingController = RatingController;
