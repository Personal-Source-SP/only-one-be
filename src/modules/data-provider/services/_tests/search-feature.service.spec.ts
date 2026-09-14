import { AppException } from '../../../../exceptions/app.exception';
import { DataProviderError } from '../../constants/data-provider-error';
import { DataProviderFeatureEntity } from '../../entities/data-provider-feature.entity';
import { ISearchTargetConfig } from '../../interfaces';
import { SearchFeatureService } from '../data-provider-feature/search-feature.service';

describe('SearchFeatureService', () => {
    let service: SearchFeatureService;
    let mockSearchService: any;

    beforeEach(() => {
        mockSearchService = {
            getExtractSearchData: jest.fn(),
        };

        service = new SearchFeatureService({
            generic: mockSearchService,
            api: mockSearchService,
        });
        jest.clearAllMocks();
    });

    describe('buildSearchUrl', () => {
        it('should return input.url if provided directly', () => {
            const url = service.buildSearchUrl({} as ISearchTargetConfig, { url: 'https://example.com/custom' });
            expect(url).toBe('https://example.com/custom');
        });

        it('should replace queryPlaceholder with encoded query', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?keyword={query}',
                queryPlaceholder: '{query}',
            };
            const url = service.buildSearchUrl(config, { query: 'áo thun' });
            expect(url).toBe('https://example.com/search?keyword=%C3%A1o%20thun');
        });

        it('should append placeholder to path when pattern has no placeholder and query is provided', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search',
                queryPlaceholder: 'q',
            };
            const url = service.buildSearchUrl(config, { query: 'shoes' });
            expect(url).toBe('https://example.com/search/shoes');
        });

        it('should return searchUrlPattern when query is empty', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search',
            };
            const url = service.buildSearchUrl(config);
            expect(url).toBe('https://example.com/search');
        });

        it('should replace generic placeholder pattern with encoded query', () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search/{keyword}',
            };
            const url = service.buildSearchUrl(config, { query: 'shoes' });
            expect(url).toBe('https://example.com/search/shoes');
        });
    });

    describe('testStateless', () => {
        it('should throw MissingSearchTestInput when url, dataContent, and htmlContentString are all missing', async () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: '',
            };

            await expect(service.testStateless('generic' as any, config, {})).rejects.toThrow(AppException);
        });

        it('should throw SearchServiceNotFound when service is not in map', async () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };

            await expect(service.testStateless('unknown' as any, config, { query: 'test' })).rejects.toThrow(AppException);
        });

        it('should call searchService.getExtractSearchData and return result', async () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };
            mockSearchService.getExtractSearchData.mockResolvedValue({
                data: [{ title: 'Item 1', price: '1000' }],
            });

            const result = await service.testStateless('generic' as any, config, { query: 'test' });
            expect(mockSearchService.getExtractSearchData).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://example.com/search?q=test',
                }),
            );
            expect(result.data).toHaveLength(1);
        });

        it('should throw FeatureTestFailed when result has error', async () => {
            const config: ISearchTargetConfig = {
                functionGenerator: '',
                searchUrlPattern: 'https://example.com/search?q={query}',
            };
            mockSearchService.getExtractSearchData.mockResolvedValue({
                error: 'Extraction failed',
            });

            await expect(service.testStateless('generic' as any, config, { query: 'test' })).rejects.toThrow(AppException);
        });
    });

    describe('testContextual', () => {
        it('should call searchService.getExtractSearchData with feature config and return result', async () => {
            const feature = {
                service: 'generic',
                config: {
                    searchUrlPattern: 'https://example.com/search?q={query}',
                },
            } as DataProviderFeatureEntity;
            mockSearchService.getExtractSearchData.mockResolvedValue({
                data: [{ title: 'Item 1' }],
            });

            const result = await service.testContextual(feature, { query: 'shoes' });
            expect(result.data).toHaveLength(1);
        });

        it('should throw FeatureValidationFailed when result has error in contextual test', async () => {
            const feature = {
                service: 'generic',
                config: {
                    searchUrlPattern: 'https://example.com/search?q={query}',
                },
            } as DataProviderFeatureEntity;
            mockSearchService.getExtractSearchData.mockResolvedValue({
                error: 'Contextual search failed',
            });

            await expect(service.testContextual(feature, { query: 'shoes' })).rejects.toThrow(AppException);
        });
    });
});
