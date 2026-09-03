import { ValidationMatchResult } from '../enums';
import { DiscoveryValidationHelper } from '../helpers/discovery-validation.helper';

describe('DiscoveryValidationHelper', () => {
    it('should classify product page with keyword match as EXACT_MATCH', () => {
        const result = DiscoveryValidationHelper.evaluateUrl({
            url: 'https://amazon.com/dp/B08N5WRWNW',
            title: 'Sony WH-1000XM4 Wireless Headphones',
            targetKeyword: 'Sony WH-1000XM4 Wireless Headphones',
        });

        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
        expect(result.matchResult).toBe(ValidationMatchResult.EXACT_MATCH);
    });

    it('should classify category / negative filter URL as NO_MATCH', () => {
        const result = DiscoveryValidationHelper.evaluateUrl({
            url: 'https://amazon.com/category/electronics/headphones',
            title: 'Electronics & Accessories',
        });

        expect(result.confidenceScore).toBeLessThan(0.4);
        expect(result.matchResult).toBe(ValidationMatchResult.NO_MATCH);
    });

    it('should classify PDP without target keyword as PARTIAL_MATCH', () => {
        const result = DiscoveryValidationHelper.evaluateUrl({
            url: 'https://shopee.vn/product/123456/789012',
            title: 'Tai nghe chụp tai Bluetooth',
        });

        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.4);
        expect(result.matchResult).toBe(ValidationMatchResult.PARTIAL_MATCH);
    });
});
