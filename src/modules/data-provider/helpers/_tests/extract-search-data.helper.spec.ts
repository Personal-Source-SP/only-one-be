import { ExtractSearchDataHelper } from '../extract-search-data.helper';

describe('ExtractSearchDataHelper', () => {
    let helper: ExtractSearchDataHelper;

    beforeEach(() => {
        helper = new ExtractSearchDataHelper();
    });

    describe('runFunctionExtractSearchData', () => {
        it('should execute searchData function and return items array', async () => {
            const functionGenerator = `
                const searchData = (html) => {
                    const $ = cheerio.load(html);
                    const items = [];
                    $('a.product').each((_, el) => {
                        items.push({ url: $(el).attr('href'), title: $(el).text() });
                    });
                    return items;
                };
            `;
            const htmlContent = '<div><a class="product" href="/p1">Product 1</a><a class="product" href="/p2">Product 2</a></div>';

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent,
            });

            expect(result).toEqual([
                { url: '/p1', title: 'Product 1' },
                { url: '/p2', title: 'Product 2' },
            ]);
        });

        it('should fallback to extractData function if searchData is not defined', async () => {
            const functionGenerator = `
                const extractData = (html) => {
                    return [{ url: 'https://example.com/item' }];
                };
            `;

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent: '<html></html>',
            });

            expect(result).toEqual([{ url: 'https://example.com/item' }]);
        });

        it('should enforce maxResults if specified', async () => {
            const functionGenerator = `
                const searchData = () => [{ url: '1' }, { url: '2' }, { url: '3' }];
            `;

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent: '<html></html>',
                maxResults: 2,
            });

            expect(result).toHaveLength(2);
        });

        it('should throw error if returned result is not an array', async () => {
            const functionGenerator = `
                const searchData = () => ({ url: 'single-item' });
            `;

            await expect(
                helper.runFunctionExtractSearchData({
                    functionGenerator,
                    htmlContent: '<html></html>',
                }),
            ).rejects.toThrow('Search extraction function must return an array of items');
        });

        it('should filter HTML by mainContentSelector before running searchData', async () => {
            const functionGenerator = `
                const searchData = (html) => {
                    const $ = cheerio.load(html);
                    const items = [];
                    $('a.item').each((_, el) => {
                        items.push({ url: $(el).attr('href') });
                    });
                    return items;
                };
            `;
            const htmlContent =
                '<html><body><header><a class="item" href="/header-link">Nav</a></header><div id="results"><a class="item" href="/p1">Product 1</a></div></body></html>';

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent,
                mainContentSelector: '#results',
            });

            expect(result).toEqual([{ url: '/p1' }]);
        });

        it('should extract parent element when isGetParentElement is true', async () => {
            const functionGenerator = `
                const searchData = (html) => {
                    const $ = cheerio.load(html);
                    const items = [];
                    $('a.item').each((_, el) => {
                        items.push({ url: $(el).attr('href') });
                    });
                    return items;
                };
            `;
            const htmlContent = '<div class="wrapper"><div class="inner"><a class="item" href="/p1">Product 1</a></div></div>';

            const result = await helper.runFunctionExtractSearchData({
                functionGenerator,
                htmlContent,
                mainContentSelector: '.inner',
                isGetParentElement: true,
            });

            expect(result).toEqual([{ url: '/p1' }]);
        });
    });

    describe('runApiFunctionExtractSearchData', () => {
        it('should execute searchData on JSON data', async () => {
            const functionGenerator = `
                const searchData = (data) => {
                    return data.items.map(item => ({ url: item.link, title: item.name }));
                };
            `;
            const data = { items: [{ link: '/item1', name: 'Item 1' }] };

            const result = await helper.runApiFunctionExtractSearchData({
                functionGenerator,
                data,
            });

            expect(result).toEqual([{ url: '/item1', title: 'Item 1' }]);
        });
    });
});
