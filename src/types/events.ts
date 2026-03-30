/**
 * All supported event types that can trigger a rating update.
 * Each maps to a specific score component in the Rating Service.
 *
 * Naming convention: <domain>.<action>
 */
export enum ActivityEventType {
    INTERVIEW_COMPLETED = 'interview.completed',        // → interviewScore
    ASSESSMENT_COMPLETED = 'assessment.completed',       // → assessmentScore
    PROFILE_UPDATED = 'profile.updated',            // → profileQualityScore
    SPOTLIGHT_POSTED = 'spotlight.posted',           // → spotlightPerformanceScore
    FAMILY_TREE_UPDATED = 'family_tree.updated',        // → familyTreeScore
}

/** Status of an event in the activity_events table */
export enum EventStatus {
    PENDING = 'pending',    // received, not yet processed
    PROCESSED = 'processed',  // successfully applied to rating
    FAILED = 'failed',     // processing failed (see error_message column)
    SKIPPED = 'skipped',    // received but intentionally ignored
}

/** The shape of the payload that must accompany every event */
export interface ActivityEventPayload {
    score: number;            // 0–10: the raw score for this specific component
    metadata?: Record<string, unknown>; // optional extra context from the source service
}

/** Full event object as stored in the DB and returned by the service */
export interface ActivityEvent {
    eventId: string;
    talentId: string;
    eventType: ActivityEventType;
    sourceService: string;
    payload: ActivityEventPayload;
    status: EventStatus;
    errorMessage?: string;
    createdAt: Date;
    processedAt?: Date;
}

/** The body shape expected on POST /internal/events */
export interface CreateEventDto {
    talentId: string;
    eventType: ActivityEventType;
    sourceService: string;
    payload: ActivityEventPayload;
}
