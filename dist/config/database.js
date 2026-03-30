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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpooledPool = exports.pool = void 0;
exports.initDatabase = initDatabase;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}
// Pooled connection — used for all regular API traffic
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required for Neon DB
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
// Unpooled connection — used for long-running operations (e.g. schema migrations)
exports.unpooledPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
});
/**
 * Tests the database connection and creates tables if they don't exist.
 * Uses the unpooled connection so schema changes aren't broken by a pooler.
 */
function initDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield exports.unpooledPool.connect();
        try {
            console.log('🔗 Connecting to Neon DB...');
            yield client.query(`
      -- Stores the current rating state for each talent
      CREATE TABLE IF NOT EXISTS talent_states (
        talent_id                   VARCHAR(255)   PRIMARY KEY,
        current_rating              NUMERIC(10, 4) NOT NULL DEFAULT 400,
        current_k_factor            NUMERIC(5, 4)  NOT NULL DEFAULT 1.0,
        engagement_count            INTEGER        NOT NULL DEFAULT 0,
        interview_score             NUMERIC(10, 4) NOT NULL DEFAULT 100,
        family_tree_score           NUMERIC(10, 4) NOT NULL DEFAULT 0,
        assessment_score            NUMERIC(10, 4) NOT NULL DEFAULT 100,
        profile_quality_score       NUMERIC(10, 4) NOT NULL DEFAULT 100,
        spotlight_performance_score NUMERIC(10, 4) NOT NULL DEFAULT 100,
        last_updated                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      -- Append-only audit log of every rating change
      CREATE TABLE IF NOT EXISTS rating_entries (
        entry_id                              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        talent_id                             VARCHAR(255)   NOT NULL REFERENCES talent_states(talent_id) ON DELETE CASCADE,
        timestamp                             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        previous_rating                       NUMERIC(10, 4) NOT NULL,
        new_rating                            NUMERIC(10, 4) NOT NULL,
        k_factor_used                         NUMERIC(5, 4)  NOT NULL,
        new_engagement_count                  INTEGER        NOT NULL,
        -- raw input scores that triggered this change
        input_interview_score                 NUMERIC(10, 4),
        input_family_tree_score               NUMERIC(10, 4),
        input_assessment_score                NUMERIC(10, 4),
        input_profile_quality_score           NUMERIC(10, 4),
        input_spotlight_performance_score     NUMERIC(10, 4),
        -- accumulated scores after this change
        current_interview_score               NUMERIC(10, 4),
        current_family_tree_score             NUMERIC(10, 4),
        current_assessment_score              NUMERIC(10, 4),
        current_profile_quality_score         NUMERIC(10, 4),
        current_spotlight_performance_score   NUMERIC(10, 4)
      );

      -- Event log: every activity from any service that affects ratings
      CREATE TABLE IF NOT EXISTS activity_events (
        event_id       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        talent_id      VARCHAR(255)   NOT NULL,
        event_type     VARCHAR(100)   NOT NULL,   -- e.g. 'interview.completed'
        source_service VARCHAR(100)   NOT NULL,   -- e.g. 'tumoro-interview-schedule'
        payload        JSONB          NOT NULL,   -- { score, metadata }
        status         VARCHAR(20)    NOT NULL DEFAULT 'pending', -- pending|processed|failed|skipped
        error_message  TEXT,                      -- populated if status = failed
        created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        processed_at   TIMESTAMPTZ
      );

      -- Index for fast lookup of events by talent
      CREATE INDEX IF NOT EXISTS idx_activity_events_talent_id ON activity_events(talent_id);
      -- Index for quickly finding all failed events
      CREATE INDEX IF NOT EXISTS idx_activity_events_status ON activity_events(status);
    `);
            console.log('✅ Connected to Neon DB. Tables verified/created successfully.');
        }
        finally {
            client.release();
        }
    });
}
