import {
  determineKFactor,
  calculateBaseScore,
  calculateNewRating,
} from '../rating.helpers';

describe('Rating Service - Rating Helpers', () => {
  describe('determineKFactor', () => {
    it('should return 1.0 for new talent (engagementCount <= 10)', () => {
      expect(determineKFactor(0)).toBe(1.0);
      expect(determineKFactor(5)).toBe(1.0);
      expect(determineKFactor(10)).toBe(1.0);
    });

    it('should return 0.5 for developing talent (10 < engagementCount <= 30)', () => {
      expect(determineKFactor(11)).toBe(0.5);
      expect(determineKFactor(20)).toBe(0.5);
      expect(determineKFactor(30)).toBe(0.5);
    });

    it('should return 0.2 for established talent (engagementCount > 30)', () => {
      expect(determineKFactor(31)).toBe(0.2);
      expect(determineKFactor(50)).toBe(0.2);
      expect(determineKFactor(100)).toBe(0.2);
    });
  });

  describe('calculateNewRating', () => {
    it('should correctly calculate new rating from current rating, baseScore and kFactor', () => {
      // currentRating: 400, baseScore: 20, kFactor: 1.0 -> 420
      expect(calculateNewRating(400, 20, 1.0)).toBe(420);

      // currentRating: 500, baseScore: -10, kFactor: 0.5 -> 495
      expect(calculateNewRating(500, -10, 0.5)).toBe(495);

      // currentRating: 700, baseScore: 30, kFactor: 0.2 -> 706
      expect(calculateNewRating(700, 30, 0.2)).toBe(706);
    });
  });

  describe('calculateBaseScore', () => {
    it('should calculate base score for scores <= 3', () => {
      // interview: 3 -> 10 * 3 - 30 = 0
      // assessment: 3 -> (25/3)*3 - 25 = 0
      // familyTree: 5, profileQuality: 5, spotlight: 5
      // total = 0 + 0 + 5 + 5 + 5 = 15
      const score = calculateBaseScore({
        interviewScore: 3,
        assessmentScore: 3,
        familyTreeScore: 5,
        profileQualityScore: 5,
        spotlightPerformanceScore: 5,
      });
      expect(score).toBeCloseTo(15);
    });

    it('should calculate base score for scores > 3', () => {
      // interview: 10 -> (30/7)*10 - (90/7) = 210/7 = 30
      // assessment: 10 -> (25/7)*10 - (75/7) = 175/7 = 25
      // familyTree: 10, profileQuality: 10, spotlight: 10
      // total = 30 + 25 + 10 + 10 + 10 = 85
      const score = calculateBaseScore({
        interviewScore: 10,
        assessmentScore: 10,
        familyTreeScore: 10,
        profileQualityScore: 10,
        spotlightPerformanceScore: 10,
      });
      expect(score).toBeCloseTo(85);
    });

    it('should handle undefined optional fields by defaulting to 0', () => {
      const score = calculateBaseScore({});
      // interviewScore 0 -> 10*0 - 30 = -30
      // assessmentScore 0 -> (25/3)*0 - 25 = -25
      // rest 0 -> total = -55
      expect(score).toBeCloseTo(-55);
    });

    it('should throw an error if interview score is out of bounds (< 0 or > 10)', () => {
      expect(() => calculateBaseScore({ interviewScore: -1 })).toThrow(
        'Interview score must be between 0 and 10.'
      );
      expect(() => calculateBaseScore({ interviewScore: 11 })).toThrow(
        'Interview score must be between 0 and 10.'
      );
    });

    it('should throw an error if assessment score is out of bounds (< 0 or > 10)', () => {
      expect(() => calculateBaseScore({ interviewScore: 5, assessmentScore: -0.5 })).toThrow(
        'Assessment score must be between 0 and 10.'
      );
      expect(() => calculateBaseScore({ interviewScore: 5, assessmentScore: 10.5 })).toThrow(
        'Assessment score must be between 0 and 10.'
      );
    });
  });
});
