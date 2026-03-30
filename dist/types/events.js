"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStatus = exports.ActivityEventType = void 0;
/**
 * All supported event types that can trigger a rating update.
 * Each maps to a specific score component in the Rating Service.
 *
 * Naming convention: <domain>.<action>
 */
var ActivityEventType;
(function (ActivityEventType) {
    ActivityEventType["INTERVIEW_COMPLETED"] = "interview.completed";
    ActivityEventType["ASSESSMENT_COMPLETED"] = "assessment.completed";
    ActivityEventType["PROFILE_UPDATED"] = "profile.updated";
    ActivityEventType["SPOTLIGHT_POSTED"] = "spotlight.posted";
    ActivityEventType["FAMILY_TREE_UPDATED"] = "family_tree.updated";
})(ActivityEventType || (exports.ActivityEventType = ActivityEventType = {}));
/** Status of an event in the activity_events table */
var EventStatus;
(function (EventStatus) {
    EventStatus["PENDING"] = "pending";
    EventStatus["PROCESSED"] = "processed";
    EventStatus["FAILED"] = "failed";
    EventStatus["SKIPPED"] = "skipped";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
