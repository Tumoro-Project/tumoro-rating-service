
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Tumoro Rating Service API',
    version: '1.0.0',
    description: 'API for calculating and managing talent ratings.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      BaseScoreInput: {
        type: 'object',
        properties: {
          interviewScore: { type: 'number' },
          familyTreeScore: { type: 'number' },
          assessmentScore: { type: 'number' },
          profileQualityScore: { type: 'number' },
          spotlightPerformanceScore: { type: 'number' },
        },
      },
      TalentState: {
        type: 'object',
        properties: {
          talentId: { type: 'string' },
          currentRating: { type: 'number' },
          currentKFactor: { type: 'number' },
          engagementCount: { type: 'number' },
          lastInputScores: {
            $ref: '#/components/schemas/BaseScoreInput',
          },
          lastUpdated: { type: 'string', format: 'date-time' },
          ratingHistory: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/RatingEntry',
            },
          },
        },
      },
      SingleScoreInput: {
        type: 'object',
        properties: {
          score: { type: 'number' },
        },
      },
      RatingEntry: {
        type: 'object',
        properties: {
          entryId: { type: 'string' },
          talentId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          previousRating: { type: 'number' },
          newRating: { type: 'number' },
          baseScore: { type: 'number' },
          kFactorUsed: { type: 'number' },
          newEngagementCount: { type: 'number' },
          inputScores: {
            $ref: '#/components/schemas/BaseScoreInput',
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
