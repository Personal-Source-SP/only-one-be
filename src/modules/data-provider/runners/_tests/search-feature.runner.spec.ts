import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderError } from '../../constants/data-provider-error';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { ISearchTargetConfig } from '../../interfaces';
import { SearchFeatureRunner } from '../search-feature.runner';

describe('SearchFeatureRunner', () => {
    let runner: SearchFeatureRunner;
    let mockSearchService: any;

    beforeEach(() => {
        mockSearchService = {
            getExtractSearchData: jest.fn(),
        };

        runner = new SearchFeatureRunner({
            generic: mockSearchService,
            api: mockSearchService,
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

        it('should append placeholder to path when pattern has no placeholder and query is provided', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search',
            };
            const url = runner.buildSearchUrl(config, { query: 'shoes' });
            expect(url).toBe('https://example.com/search/shoes');
        });

        it('should return path with placeholder if pattern ends with slash and query is empty', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/categories/',
                queryPlaceholder: '{query}',
            };
            const url = runner.buildSearchUrl(config);
            expect(url).toBe('https://example.com/categories/{query}');
        });

        it('should replace query into trailing path when pattern has trailing slash', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/categories/',
                queryPlaceholder: '{query}',
            };
            const url = runner.buildSearchUrl(config, { query: 'shoes' });
            expect(url).toBe('https://example.com/categories/shoes');
        });

        it('should return empty string if no searchUrlPattern or url provided', () => {
            const url = runner.buildSearchUrl({} as ISearchTargetConfig);
            expect(url).toBe('');
        });
    });

    describe('testStateless', () => {
        it('should throw AppException when no URL or content is resolvable', async () => {
            await expect(runner.testStateless('generic', {} as any, {})).rejects.toThrow(AppException);
        });

        it('should throw AppException when search service is not found', async () => {
            await expect(
                runner.testStateless('unknown', { searchUrlPattern: 'https://example.com' } as any, { query: 'test' }),
            ).rejects.toThrow(AppException);
        });

        it('should throw AppException when search service returns error', async () => {
            mockSearchService.getExtractSearchData.mockResolvedValue({
                error: 'Invalid search pattern or selector',
            });

            const config: ISearchTargetConfig = {
                functionGenerator: 'const searchData = () => []',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };

            await expect(runner.testStateless('generic', config, { query: 'test' })).rejects.toThrow(AppException);
        });

        it('should call getExtractSearchData on valid search service', async () => {
            mockSearchService.getExtractSearchData.mockResolvedValue({
                data: [{ title: 'Item 1', url: '/p1' }],
                html: '<div>Search</div>',
            });

            const config: ISearchTargetConfig = {
                functionGenerator: 'const searchData = () => []',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };

            const result = await runner.testStateless('generic', config, { query: 'test' });
            expect(result).toEqual({ data: [{ title: 'Item 1', url: '/p1' }], html: '<div>Search</div>' });
            expect(mockSearchService.getExtractSearchData).toHaveBeenCalledWith({
                url: 'https://example.com/search?q=test',
                dataContent: undefined,
                targetConfig: config,
                htmlContentString: undefined,
            });
        });
    });

    describe('testContextual', () => {
        it('should throw AppException if search service returns error', async () => {
            mockSearchService.getExtractSearchData.mockResolvedValue({ error: 'Search scraping validation failed' });

            const feature = {
                service: 'generic',
                config: { searchUrlPattern: 'https://example.com/search?q={query}' },
            } as DataProviderFeatureEntity;

            await expect(runner.testContextual(feature, { query: 'test' })).rejects.toThrow(AppException);
        });

        it('should return extract result on success', async () => {
            mockSearchService.getExtractSearchData.mockResolvedValue({
                data: [{ title: 'Item Context', url: '/ctx' }],
                html: '<html></html>',
            });

            const feature = {
                service: 'generic',
                config: { searchUrlPattern: 'https://example.com/search?q={query}' },
            } as DataProviderFeatureEntity;

            const result = await runner.testContextual(feature, { query: 'test' });
            expect(result).toEqual({ data: [{ title: 'Item Context', url: '/ctx' }], html: '<html></html>' });
        });
    });
});
