import { BadRequestException } from '@nestjs/common';

import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { ISearchTargetConfig } from '../../interfaces';
import { SearchFeatureRunner } from '../search-feature.runner';

describe('SearchFeatureRunner', () => {
    let runner: SearchFeatureRunner;
    let mockScraperService: any;

    beforeEach(() => {
        mockScraperService = {
            getExtractData: jest.fn(),
            scrapeItemData: jest.fn(),
            validateParserFunction: jest.fn(),
        };

        runner = new SearchFeatureRunner({
            generic: mockScraperService,
        });
        jest.clearAllMocks();
    });

    describe('buildSearchUrl', () => {
        it('should return input.url if provided directly', () => {
            const url = runner.buildSearchUrl({} as ISearchTargetConfig, { url: 'https://example.com/custom' });
            expect(url).toBe('https://example.com/custom');
        });

        it('should replace queryPlaceholder with encoded query', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?keyword={query}',
                queryPlaceholder: '{query}',
            };
            const url = runner.buildSearchUrl(config, { query: 'áo thun' });
            expect(url).toBe('https://example.com/search?keyword=%C3%A1o%20thun');
        });

        it('should fallback to appending ?q= when pattern has no placeholder', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search',
            };
            const url = runner.buildSearchUrl(config, { query: 'shoes' });
            expect(url).toBe('https://example.com/search?q=shoes');
        });

        it('should return empty string if no searchUrlPattern or url provided', () => {
            const url = runner.buildSearchUrl({} as ISearchTargetConfig);
            expect(url).toBe('');
        });
    });

    describe('testStateless', () => {
        it('should throw BadRequestException when no URL or content is resolvable', async () => {
            await expect(runner.testStateless('generic', {} as any, {})).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when scraper service is not found', async () => {
            await expect(
                runner.testStateless('unknown', { searchUrlPattern: 'https://example.com' } as any, { query: 'test' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should call getExtractData on valid scraper service', async () => {
            mockScraperService.getExtractData.mockResolvedValue({ data: [{ title: 'Item 1' }] });

            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };

            const result = await runner.testStateless('generic', config, { query: 'test' });
            expect(result).toEqual({ data: [{ title: 'Item 1' }] });
            expect(mockScraperService.getExtractData).toHaveBeenCalledWith({
                url: 'https://example.com/search?q=test',
                dataContent: undefined,
                targetConfig: config,
                htmlContentString: undefined,
            });
        });
    });

    describe('testContextual', () => {
        it('should throw BadRequestException if scraper service returns error', async () => {
            mockScraperService.getExtractData.mockResolvedValue({ error: 'Failed to fetch html' });

            const feature = {
                service: 'generic',
                config: { searchUrlPattern: 'https://example.com/search?q={query}' },
            } as DataProviderFeatureEntity;

            await expect(runner.testContextual(feature, { query: 'test' })).rejects.toThrow(BadRequestException);
        });

        it('should return extract result on success', async () => {
            mockScraperService.getExtractData.mockResolvedValue({ data: [{ title: 'Item Context' }] });

            const feature = {
                service: 'generic',
                config: { searchUrlPattern: 'https://example.com/search?q={query}' },
            } as DataProviderFeatureEntity;

            const result = await runner.testContextual(feature, { query: 'test' });
            expect(result).toEqual({ data: [{ title: 'Item Context' }] });
        });
    });
});
