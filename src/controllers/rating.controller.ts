import { Request, Response } from "express";
import { RatingService } from "../services/rating.service";
import { BaseScoreInput } from "../models/IDataModels";
import {
  determineKFactor,
  calculateBaseScore,
} from "../utilities/rating.helpers";

const ratingService = new RatingService();

export class RatingController {
  /**
   * @description Get the rating of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the rating of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the interview score of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the family tree score of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the assessment score of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the profile quality score of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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

  /**
   * @description Update the spotlight performance score of a talent with a given ID.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
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
