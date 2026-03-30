"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
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
                    interviewScore: { type: 'number', nullable: true },
                    familyTreeScore: { type: 'number', nullable: true },
                    assessmentScore: { type: 'number', nullable: true },
                    profileQualityScore: { type: 'number', nullable: true },
                    spotlightPerformanceScore: { type: 'number', nullable: true },
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
                    kFactorUsed: { type: 'number' },
                    newEngagementCount: { type: 'number' },
                    inputScores: {
                        $ref: '#/components/schemas/BaseScoreInput',
                    },
                    currentScores: {
                        $ref: '#/components/schemas/BaseScoreInput',
                    },
                },
            },
            ActivityEventPayload: {
                type: 'object',
                properties: {
                    score: { type: 'number', description: 'Raw score (0-10) for this component' },
                    metadata: { type: 'object', additionalProperties: true },
                },
                required: ['score'],
            },
            ActivityEvent: {
                type: 'object',
                properties: {
                    eventId: { type: 'string', format: 'uuid' },
                    talentId: { type: 'string' },
                    eventType: {
                        type: 'string',
                        enum: ['interview.completed', 'assessment.completed', 'profile.updated', 'spotlight.posted', 'family_tree.updated'],
                    },
                    sourceService: { type: 'string' },
                    payload: { $ref: '#/components/schemas/ActivityEventPayload' },
                    status: { type: 'string', enum: ['pending', 'processed', 'failed', 'skipped'] },
                    errorMessage: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    processedAt: { type: 'string', format: 'date-time' },
                },
            },
            CreateEventDto: {
                type: 'object',
                properties: {
                    talentId: { type: 'string' },
                    eventType: {
                        type: 'string',
                        enum: ['interview.completed', 'assessment.completed', 'profile.updated', 'spotlight.posted', 'family_tree.updated'],
                    },
                    sourceService: { type: 'string' },
                    payload: { $ref: '#/components/schemas/ActivityEventPayload' },
                },
                required: ['talentId', 'eventType', 'sourceService', 'payload'],
            },
        },
    },
};
const options = {
    swaggerDefinition,
    apis: ['./src/routes/*.ts'],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
