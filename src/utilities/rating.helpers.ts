
import { BaseScoreInput } from '../models/IDataModels';

function convertInterviewScore(score: number): number {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Interview score must be between 0 and 10.");
    }
    if (score <= 3) {
        return 10 * score - 30;
    } else {
        return (30 / 7) * score - (90 / 7);
    }
}

function convertAssessmentScore(score: number): number {
    if (score < 0 || score > 10) {
        // Or handle as per application's error handling strategy
        throw new Error("Assessment score must be between 0 and 10.");
    }
    if (score <= 3) {
        return (25 / 3) * score - 25;
    } else {
        return (25 / 7) * score - (75 / 7);
    }
}

export function calculateBaseScore(inputScores: BaseScoreInput): number {
    const convertedInterviewScore = convertInterviewScore(inputScores.interviewScore ?? 0);
    const convertedAssessmentScore = convertAssessmentScore(inputScores.assessmentScore ?? 0);

    const baseScore =
        convertedInterviewScore +
        convertedAssessmentScore +
        (inputScores.familyTreeScore ?? 0) +
        (inputScores.profileQualityScore ?? 0) +
        (inputScores.spotlightPerformanceScore ?? 0);

    return baseScore;
}

export function determineKFactor(engagementCount: number): number {
    if (engagementCount <= 10) {
        return 1.0; // Tier 1: New Talent
    } else if (engagementCount <= 30) {
        return 0.5; // Tier 2: Developing Talent
    } else {
        return 0.2; // Tier 3: Established Talent
    }
}

export function calculateNewRating(currentRating: number, baseScore: number, kFactor: number): number {
    return Number((currentRating + kFactor * baseScore).toFixed(2));
}

export type QuestionnaireAnswersInput = Record<string, string | string[]>;

interface ChoiceWeightOption {
    label: string;
    weight: number;
    isExclusive?: boolean;
}

interface QuestionnaireItemSpec {
    id: number;
    type: 'single' | 'multi' | 'short' | 'scale';
    maxWeight: number;
    options?: ChoiceWeightOption[];
}

export const FAMILY_HISTORY_QUESTIONNAIRE_SPEC: QuestionnaireItemSpec[] = [
    {
        id: 1,
        type: 'single',
        maxWeight: 12,
        options: [
            { label: 'Every day', weight: 12 },
            { label: 'Every week', weight: 10 },
            { label: 'Every month', weight: 7 },
            { label: 'A few times a year', weight: 4 },
            { label: 'Almost never', weight: 1 },
        ],
    },
    {
        id: 2,
        type: 'multi',
        maxWeight: 15,
        options: [
            { label: 'Started a family tree', weight: 3 },
            { label: 'Talked to a relative about family memories', weight: 3 },
            { label: 'Saved old photos or documents', weight: 3 },
            { label: 'Written down a family story', weight: 3 },
            { label: 'Shared what I found with family', weight: 3 },
            { label: 'None yet', weight: 0, isExclusive: true },
        ],
    },
    { id: 3, type: 'short', maxWeight: 10 },
    { id: 4, type: 'short', maxWeight: 10 },
    { id: 5, type: 'short', maxWeight: 10 },
    {
        id: 6,
        type: 'single',
        maxWeight: 11,
        options: [
            { label: 'My parents', weight: 3 },
            { label: 'My grandparents', weight: 6 },
            { label: 'My great-grandparents', weight: 9 },
            { label: 'Even further back', weight: 11 },
        ],
    },
    {
        id: 7,
        type: 'single',
        maxWeight: 8,
        options: [
            { label: 'Never', weight: 1 },
            { label: 'Sometimes', weight: 4 },
            { label: 'Often', weight: 6 },
            { label: 'Always', weight: 8 },
        ],
    },
    {
        id: 8,
        type: 'single',
        maxWeight: 8,
        options: [
            { label: 'Give up', weight: 1 },
            { label: 'Take a break', weight: 4 },
            { label: 'Try something new', weight: 7 },
            { label: 'Ask for help', weight: 8 },
        ],
    },
    {
        id: 9,
        type: 'scale',
        maxWeight: 8,
        options: [
            { label: '1', weight: 1.5 },
            { label: '2', weight: 3 },
            { label: '3', weight: 5 },
            { label: '4', weight: 6.5 },
            { label: '5', weight: 8 },
        ],
    },
    {
        id: 10,
        type: 'single',
        maxWeight: 8,
        options: [
            { label: 'Not at all', weight: 1 },
            { label: 'A little', weight: 3.5 },
            { label: 'Somewhat', weight: 6 },
            { label: 'A lot', weight: 8 },
        ],
    },
];

/**
 * Normalizes a Family Tree / Lineage score into the 0–10 scale.
 * Values > 10 are treated as 0–100 raw questionnaire points and divided by 10.
 */
export function normalizeFamilyTreeScore(score: number): number {
    if (!Number.isFinite(score) || score <= 0) return 0;
    const scaled = score > 10 ? score / 10 : score;
    return Number(Math.min(10, Math.max(0, scaled)).toFixed(2));
}

/**
 * Calculates the weighted Family History Commitment Questionnaire score (0–100 raw points and 0–10 Lineage Score).
 */
export function calculateFamilyHistoryQuestionnaireScore(
    answers: QuestionnaireAnswersInput
): { rawPoints: number; scoreOutOf10: number } {
    let total = 0;

    for (const q of FAMILY_HISTORY_QUESTIONNAIRE_SPEC) {
        const ans = answers[String(q.id)] ?? answers[q.id as unknown as string];
        if (ans === undefined || ans === null) continue;

        if (q.type === 'single' || q.type === 'scale') {
            const opt = q.options?.find((o) => o.label === ans);
            if (opt) total += opt.weight;
        } else if (q.type === 'multi') {
            const selected = Array.isArray(ans) ? ans : [];
            if (!selected.includes('None yet')) {
                let sum = 0;
                for (const label of selected) {
                    const opt = q.options?.find((o) => o.label === label);
                    if (opt) sum += opt.weight;
                }
                total += Math.min(sum, q.maxWeight);
            }
        } else if (q.type === 'short') {
            const text = typeof ans === 'string' ? ans.trim() : '';
            const words = text ? text.split(/\s+/).length : 0;
            if (text.length >= 50 || words >= 10) {
                total += q.maxWeight;
            } else if (text.length >= 20 || words >= 4) {
                total += 7;
            } else if (text.length >= 3) {
                total += 4;
            }
        }
    }

    const rawPoints = Math.min(100, Math.max(0, Math.round(total)));
    const scoreOutOf10 = Number((rawPoints / 10).toFixed(2));
    return { rawPoints, scoreOutOf10 };
}
