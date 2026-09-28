import { Request, Response, NextFunction } from 'express';
import { baseScoreSchema, singleScoreSchema } from '../schemas';
import { validate } from '../validation';

describe('Rating Service - Validation Middleware & Schemas', () => {
  describe('baseScoreSchema', () => {
    it('should validate a valid baseScore payload', () => {
      const validPayload = {
        interviewScore: 8.5,
        familyTreeScore: 6.0,
        assessmentScore: 7.2,
        profileQualityScore: 9.0,
        spotlightPerformanceScore: 50.0,
      };

      const result = baseScoreSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('should reject scores below 0 or above 10 for bounded fields', () => {
      const negativeResult = baseScoreSchema.safeParse({
        interviewScore: -1,
        familyTreeScore: 5,
        assessmentScore: 5,
        profileQualityScore: 5,
        spotlightPerformanceScore: 10,
      });
      expect(negativeResult.success).toBe(false);

      const excessResult = baseScoreSchema.safeParse({
        interviewScore: 10.5,
        familyTreeScore: 5,
        assessmentScore: 5,
        profileQualityScore: 5,
        spotlightPerformanceScore: 10,
      });
      expect(excessResult.success).toBe(false);
    });

    it('should allow spotlightPerformanceScore to exceed 10 as long as it is non-negative', () => {
      const result = baseScoreSchema.safeParse({
        interviewScore: 5,
        familyTreeScore: 5,
        assessmentScore: 5,
        profileQualityScore: 5,
        spotlightPerformanceScore: 150,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-number types', () => {
      const result = baseScoreSchema.safeParse({
        interviewScore: 'excellent',
        familyTreeScore: 5,
        assessmentScore: 5,
        profileQualityScore: 5,
        spotlightPerformanceScore: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('singleScoreSchema', () => {
    it('should validate score between 0 and 10', () => {
      expect(singleScoreSchema.safeParse({ score: 0 }).success).toBe(true);
      expect(singleScoreSchema.safeParse({ score: 5.5 }).success).toBe(true);
      expect(singleScoreSchema.safeParse({ score: 10 }).success).toBe(true);
    });

    it('should fail when score is outside 0-10 range', () => {
      expect(singleScoreSchema.safeParse({ score: -0.1 }).success).toBe(false);
      expect(singleScoreSchema.safeParse({ score: 10.1 }).success).toBe(false);
    });

    it('should fail when score property is missing', () => {
      expect(singleScoreSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('validate middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should call next and attach validated data to req.body on valid input', () => {
      mockReq.body = { score: 7.5 };
      const middleware = validate(singleScoreSchema);

      middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.body).toEqual({ score: 7.5 });
    });

    it('should return 400 with validation errors on invalid input', () => {
      mockReq.body = { score: 12 };
      const middleware = validate(singleScoreSchema);

      middleware(mockReq as Request, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.objectContaining({
            score: expect.any(Array),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
