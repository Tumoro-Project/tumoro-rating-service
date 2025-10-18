import { Request, Response } from "express";
import { RatingService } from "../services/rating.service";
import { BaseScoreInput } from "../models/IDataModels";
import {
  determineKFactor,
  calculateBaseScore,
} from "../utilities/rating.helpers";

const ratingService = new RatingService();

export class RatingController {
  public getTalentRating(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { includeHistory } = req.query;

    const talentState = ratingService.getTalentState(talentId);

    if (includeHistory === "true") {
      const ratingHistory = ratingService.getRatingHistory(talentId);
      res.status(200).json({ ...talentState, ratingHistory });
    } else {
      res.status(200).json(talentState);
    }
  }

  public updateTalentRating(req: Request, res: Response): void {
    const { talentId } = req.params;
    const inputScores: BaseScoreInput = req.body;

    // Basic validation
    if (!inputScores || typeof inputScores !== "object") {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }
    const previousRating = ratingService.getTalentState(talentId);

    const newKFactor = determineKFactor(previousRating.engagementCount + 1);
    const newBaseScore = calculateBaseScore(inputScores);

    console.log("Previous Rating:", previousRating);
    console.log("Input Scores:", inputScores);
    console.log("New K-Factor:", newKFactor);
    console.log("New Engagement Count:", previousRating.engagementCount + 1);
    console.log("New Base Score:", newBaseScore);

    // const newTalentState = ratingService.updateTalentRating(
    //   talentId,
    //   inputScores
    // );
    // res.status(200).json(newTalentState);
  }

  public updateInterviewScore(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { score } = req.body;

    if (typeof score !== "number") {
      res.status(400).json({ message: "Invalid score" });
      return;
    }

    const newTalentState = ratingService.updateInterviewScore(talentId, score);
    res.status(200).json(newTalentState);
  }

  public updateFamilyTreeScore(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { score } = req.body;

    if (typeof score !== "number") {
      res.status(400).json({ message: "Invalid score" });
      return;
    }

    const newTalentState = ratingService.updateFamilyTreeScore(talentId, score);
    res.status(200).json(newTalentState);
  }

  public updateAssessmentScore(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { score } = req.body;

    if (typeof score !== "number") {
      res.status(400).json({ message: "Invalid score" });
      return;
    }

    const newTalentState = ratingService.updateAssessmentScore(talentId, score);
    res.status(200).json(newTalentState);
  }

  public updateProfileQualityScore(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { score } = req.body;

    if (typeof score !== "number") {
      res.status(400).json({ message: "Invalid score" });
      return;
    }

    const newTalentState = ratingService.updateProfileQualityScore(
      talentId,
      score
    );
    res.status(200).json(newTalentState);
  }

  public updateSpotlightPerformanceScore(req: Request, res: Response): void {
    const { talentId } = req.params;
    const { score } = req.body;

    if (typeof score !== "number") {
      res.status(400).json({ message: "Invalid score" });
      return;
    }

    const newTalentState = ratingService.updateSpotlightPerformanceScore(
      talentId,
      score
    );
    res.status(200).json(newTalentState);
  }
}
