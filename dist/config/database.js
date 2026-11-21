"use strict";
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
async function initDatabase() {
    const client = await exports.unpooledPool.connect();
    try {
        console.log('🔗 Connecting to Neon DB...');
        await client.query(`
      -- Stores the current rating state for each talent
      CREATE TABLE IF NOT EXISTS talent_states (
        talent_id                   VARCHAR(255)   PRIMARY KEY,
        current_rating              NUMERIC(10, 4) NOT NULL DEFAULT 0,
        current_k_factor            NUMERIC(5, 4)  NOT NULL DEFAULT 1.0,
        engagement_count            INTEGER        NOT NULL DEFAULT 0,
        interview_score             NUMERIC(10, 4) NOT NULL DEFAULT 0,
        family_tree_score           NUMERIC(10, 4) NOT NULL DEFAULT 0,
        assessment_score            NUMERIC(10, 4) NOT NULL DEFAULT 0,
        profile_quality_score       NUMERIC(10, 4) NOT NULL DEFAULT 0,
        spotlight_performance_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
        character_score             NUMERIC(10, 4) NOT NULL DEFAULT 0,
        last_updated                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      ALTER TABLE talent_states
        ALTER COLUMN current_rating SET DEFAULT 0,
        ALTER COLUMN interview_score SET DEFAULT 0,
        ALTER COLUMN family_tree_score SET DEFAULT 0,
        ALTER COLUMN assessment_score SET DEFAULT 0,
        ALTER COLUMN profile_quality_score SET DEFAULT 0,
        ALTER COLUMN spotlight_performance_score SET DEFAULT 0;

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
        -- new character dimensions
        input_integrity                       INTEGER,
        input_consistency                     INTEGER,
        input_investment_in_others            INTEGER,
        input_long_term_thinking              INTEGER,
        input_honesty                         INTEGER,
        rater_relationship                    VARCHAR(50),
        -- accumulated scores after this change
        current_interview_score               NUMERIC(10, 4),
        current_family_tree_score             NUMERIC(10, 4),
        current_assessment_score              NUMERIC(10, 4),
        current_profile_quality_score         NUMERIC(10, 4),
        current_spotlight_performance_score   NUMERIC(10, 4),
        current_character_score               NUMERIC(10, 4)
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
      -- Index for weekly momentum calculation (7-day delta)
      CREATE INDEX IF NOT EXISTS idx_rating_entries_talent_timestamp ON rating_entries(talent_id, timestamp DESC);

      -- Peer-to-peer character ratings (1-5 per dimension, one active rating per rater->talent pair)
      CREATE TABLE IF NOT EXISTS character_ratings (
        id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        talent_id            VARCHAR(255) NOT NULL,
        rater_id             VARCHAR(255) NOT NULL,
        integrity            SMALLINT     NOT NULL CHECK (integrity BETWEEN 1 AND 5),
        consistency          SMALLINT     NOT NULL CHECK (consistency BETWEEN 1 AND 5),
        investment_in_others SMALLINT     NOT NULL CHECK (investment_in_others BETWEEN 1 AND 5),
        long_term_thinking   SMALLINT     NOT NULL CHECK (long_term_thinking BETWEEN 1 AND 5),
        honesty              SMALLINT     NOT NULL CHECK (honesty BETWEEN 1 AND 5),
        rater_relationship   VARCHAR(32)  NOT NULL,
        anonymous            BOOLEAN      NOT NULL DEFAULT TRUE,
        session_id           VARCHAR(255),
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (talent_id, rater_id)
      );

      CREATE INDEX IF NOT EXISTS idx_character_ratings_talent_id ON character_ratings(talent_id);
    `);
        console.log('✅ Connected to Neon DB. Tables verified/created successfully.');
    }
    finally {
        client.release();
    }
}
