import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderFeatureType } from '../../enums/data-provider-feature-type.enum';
import { IScrapingTargetConfig, ISearchTargetConfig } from '../../interfaces/target-config.interface';
import { TargetConfigValidatorHelper } from '../target-config-validator.helper';

describe('TargetConfigValidatorHelper', () => {
    describe('validateScrapingTargetConfig', () => {
        it('should throw error when rawConfig is not an object', () => {
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig(null)).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig('string')).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig([])).toThrow(AppException);
        });

        it('should throw error when functionGenerator is missing or empty', () => {
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig({})).toThrow(AppException);
            expect(() => TargetConfigValidatorHelper.validateScrapingTargetConfig({ functionGenerator: '   ' })).toThrow(AppException);
        });

        it('should throw error when functionGenerator has syntax error', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'const a = {;',
                }),
            ).toThrow(AppException);
        });

        it('should throw error when numeric options are invalid', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    timeout: -100,
                }),
            ).toThrow(AppException);

            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    retryAttempts: -1,
                }),
            ).toThrow(AppException);
        });

        it('should throw error when cookies contain invalid elements', () => {
            expect(() =>
                TargetConfigValidatorHelper.validateScrapingTargetConfig({
                    functionGenerator: 'return {};',
                    cookies: [{ name: 'test' }] as unknown as IScrapingTargetConfig['cookies'],
                }),
            ).toThrow(AppException);
        });

        it('should return validated IScrapingTargetConfig on success', () => {
            const config: IScrapingTargetConfig = {
                functionGenerator: 'return { title: "sample" };',
                timeout: 5000,
                retryAttempts: 2,
                cookies: [{ name: 'token', value: 'xyz' }],
            };
            const result = TargetConfigValidatorHelper.validateScrapingTargetConfig(config);
            expect(result).toEqual(config);
        });
    });

    describe('validateSearchTargetConfig', () => {
        it('should validate search specific fields', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: 'return [];',
                searchUrlPattern: 'https://example.com/search?q={query}',
                queryPlaceholder: '{query}',
                resultSelector: '.item',
            };
            const result = TargetConfigValidatorHelper.validateSearchTargetConfig(config);
            expect(result.searchUrlPattern).toBe('https://example.com/search?q={query}');
            expect(result.queryPlaceholder).toBe('{query}');
        });
    });

    describe('validateConfig by type', () => {
        it('should route to search validator when type is SEARCH', () => {
            const config = {
                functionGenerator: 'return [];',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };
            const result = TargetConfigValidatorHelper.validateConfig(config, DataProviderFeatureType.SEARCH);
            expect((result as ISearchTargetConfig).searchUrlPattern).toBe('https://example.com/search?q={query}');
        });
    });
});
