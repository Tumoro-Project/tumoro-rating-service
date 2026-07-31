import { Request, Response } from 'express';
import { RatingService } from '../services/rating.service';
import { BaseScoreInput } from '../models/IDataModels';

const ratingService = new RatingService();

export class RatingController {
  /**
   * GET /v1/talent/:talentId/rating
   * Returns current rating state, optionally including full history.
   */
  public async getTalentRating(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const talentState = await ratingService.getTalentState(talentId);

      if (req.query.includeHistory === 'true') {
        const ratingHistory = await ratingService.getRatingHistory(talentId);
        res.status(200).json({ ...talentState, ratingHistory });
      } else {
        res.status(200).json(talentState);
      }
    } catch (err) {
      console.error('getTalentRating error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * GET /v1/ratings/trending
   * Returns the fastest growing talent based on momentum score.
   */
  public async getTrendingTalent(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const trending = await ratingService.getTrendingTalent(limit);
      res.status(200).json({ results: trending });
    } catch (err) {
      console.error('getTrendingTalent error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId
   * Updates all score components at once.
   */
  public async updateTalentRating(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const inputScores: BaseScoreInput = req.body;

      const newTalentState = await ratingService.updateTalentRating(talentId, inputScores);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateTalentRating error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId/interview-score
   */
  public async updateInterviewScore(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const { score } = req.body;
      const newTalentState = await ratingService.updateInterviewScore(talentId, score);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateInterviewScore error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId/family-tree-score
   */
  public async updateFamilyTreeScore(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const { score } = req.body;
      const newTalentState = await ratingService.updateFamilyTreeScore(talentId, score);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateFamilyTreeScore error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId/assessment-score
   */
  public async updateAssessmentScore(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const { score } = req.body;
      const newTalentState = await ratingService.updateAssessmentScore(talentId, score);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateAssessmentScore error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId/profile-quality-score
   */
  public async updateProfileQualityScore(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const { score } = req.body;
      const newTalentState = await ratingService.updateProfileQualityScore(talentId, score);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateProfileQualityScore error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * POST /v1/ratings/update/:talentId/spotlight-performance-score
   */
  public async updateSpotlightPerformanceScore(req: Request, res: Response): Promise<void> {
    try {
      const talentId = req.params.talentId as string;
      const { score } = req.body;
      const newTalentState = await ratingService.updateSpotlightPerformanceScore(talentId, score);
      res.status(200).json(newTalentState);
    } catch (err) {
      console.error('updateSpotlightPerformanceScore error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * GET /v1/talent/:talentId/character-breakdown
   */
  public async getCharacterBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const breakdown = {
        totalCount: 0,
        publicScore: false,
        averages: {
          integrity: 0,
          consistency: 0,
          investmentInOthers: 0,
          longTermThinking: 0,
          honesty: 0,
        },
        raterRelationshipCounts: {
          PROFESSIONAL: 0,
          COLLEAGUE: 0,
          COMMUNITY: 0,
          MENTOR: 0,
        },
        hasCharacterMomentum: false,
      };
      res.status(200).json(breakdown);
    } catch (err) {
      console.error('getCharacterBreakdown error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
