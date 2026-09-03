import { PDP_NEGATIVE_KEYWORDS, PDP_POSITIVE_KEYWORDS } from '../constants/discovery-constants';
import { ValidationMatchResult } from '../enums';

export interface ValidationEvaluationResult {
    confidenceScore: number;
    matchResult: ValidationMatchResult;
    reason: string;
    matchedCriteria: Record<string, any>;
}

export class DiscoveryValidationHelper {
    public static evaluateUrl(params: {
        url: string;
        title?: string;
        targetKeyword?: string;
        domain?: string;
    }): ValidationEvaluationResult {
        const { url, title, targetKeyword } = params;
        const normalizedUrl = url.toLowerCase();
        let pathScore = 0;
        let negativeHit = false;

        // 1. Negative Filter Check
        for (const neg of PDP_NEGATIVE_KEYWORDS) {
            if (normalizedUrl.includes(neg)) {
                negativeHit = true;
                break;
            }
        }

        // 2. Positive PDP Path Check
        for (const pos of PDP_POSITIVE_KEYWORDS) {
            if (normalizedUrl.includes(pos)) {
                pathScore = 0.5;
                break;
            }
        }
        if (negativeHit) {
            pathScore = Math.max(0, pathScore - 0.3);
        }

        // 3. Token Overlap / Similarity Check
        let similarityScore = 0.2; // Baseline for valid domain page
        if (targetKeyword && title) {
            const targetTokens = targetKeyword
                .toLowerCase()
                .split(/\s+/)
                .filter((t) => t.length > 2);
            if (targetTokens.length > 0) {
                const matchedTokens = targetTokens.filter((t) => title.toLowerCase().includes(t));
                similarityScore = (matchedTokens.length / targetTokens.length) * 0.3;
            }
        }

        const totalScore = Math.min(1.0, parseFloat((pathScore + similarityScore).toFixed(2)));

        let matchResult = ValidationMatchResult.NO_MATCH;
        if (totalScore >= 0.7) {
            matchResult = ValidationMatchResult.EXACT_MATCH;
        } else if (totalScore >= 0.4) {
            matchResult = ValidationMatchResult.PARTIAL_MATCH;
        } else {
            matchResult = ValidationMatchResult.NO_MATCH;
        }

        return {
            confidenceScore: totalScore,
            matchResult,
            reason: `Heuristic: PDP=${pathScore > 0}, Negative=${negativeHit}, Similarity=${similarityScore}`,
            matchedCriteria: { pathScore, similarityScore, negativeHit },
        };
    }
}
