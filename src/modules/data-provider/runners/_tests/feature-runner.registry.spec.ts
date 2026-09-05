import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderFeatureType } from '../../enums';
import { FeatureRunnerRegistry } from '../feature-runner.registry';
import { ScrapingFeatureRunner } from '../scraping-feature.runner';
import { SearchFeatureRunner } from '../search-feature.runner';

describe('FeatureRunnerRegistry', () => {
    let registry: FeatureRunnerRegistry;
    const mockScrapingRunner = {} as ScrapingFeatureRunner;
    const mockSearchRunner = {} as SearchFeatureRunner;

    beforeEach(() => {
        registry = new FeatureRunnerRegistry(mockScrapingRunner, mockSearchRunner);
    });

    it('should return ScrapingFeatureRunner for SCRAPING type', () => {
        expect(registry.getRunner(DataProviderFeatureType.SCRAPING)).toBe(mockScrapingRunner);
    });

    it('should return SearchFeatureRunner for SEARCH type', () => {
        expect(registry.getRunner(DataProviderFeatureType.SEARCH)).toBe(mockSearchRunner);
    });

    it('should throw AppException when runner is not found', () => {
        expect(() => registry.getRunner('INVALID' as any)).toThrow(AppException);
    });
});
