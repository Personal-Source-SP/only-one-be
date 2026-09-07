import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { SearchResultItemDto } from '../dtos/responses/search-extract-data-response.dto';
import { IRunApiSearchFunctionExtractData, IRunSearchFunctionExtractData } from '../interfaces/target-config.interface';

@Injectable()
export class ExtractSearchDataHelper {
    async runFunctionExtractSearchData(dto: IRunSearchFunctionExtractData): Promise<SearchResultItemDto[]> {
        const { functionGenerator, htmlContent, resultSelector, maxResults, mainContentSelector, isGetParentElement } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        try {
            const transformedFn = this.transformFunction(functionGenerator);
            const runFn = new Function(
                'cheerio',
                'resultSelector',
                `return (html) => {
                    ${transformedFn}
                    if (typeof searchData === 'function') {
                        return searchData(html);
                    }
                    if (typeof extractData === 'function') {
                        return extractData(html);
                    }
                    throw new Error('Neither searchData nor extractData function is defined');
                }`,
            )(cheerio, resultSelector || '');

            const htmlContentTransformed = this.transformHtmlContent(htmlContent);
            const mainContent = this.getMainContent({
                html: htmlContentTransformed,
                options: { mainContentSelector, isChildren: isGetParentElement },
            });
            if (!mainContent) {
                throw new Error(`Main content not found for selector: ${mainContentSelector}`);
            }

            const result = runFn(mainContent);

            if (!Array.isArray(result)) {
                throw new Error('Search extraction function must return an array of items');
            }

            if (maxResults && maxResults > 0 && result.length > maxResults) {
                return result.slice(0, maxResults);
            }

            return result;
        } catch (error) {
            console.error('Error run search function extract data:', error?.message);
            throw new Error(`Error run search function extract data: ${error?.message}`);
        }
    }

    async runApiFunctionExtractSearchData(dto: IRunApiSearchFunctionExtractData): Promise<SearchResultItemDto[]> {
        const { functionGenerator, data, maxResults } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }

        try {
            const transformedFn = this.transformFunction(functionGenerator);
            const runFn = new Function(
                'data',
                'axios',
                `return async (data, axios) => {
                    ${transformedFn}
                    if (typeof searchData === 'function') {
                        return await searchData(data, axios);
                    }
                    if (typeof extractData === 'function') {
                        return await extractData(data, axios);
                    }
                    throw new Error('Neither searchData nor extractData function is defined');
                }`,
            )(data, axios);

            const result = await runFn(data, axios);

            if (!Array.isArray(result)) {
                throw new Error('Search API extraction function must return an array of items');
            }

            if (maxResults && maxResults > 0 && result.length > maxResults) {
                return result.slice(0, maxResults);
            }

            return result;
        } catch (error) {
            console.error('Error run API search function extract data:', error?.message);
            throw new Error(`Error run API search function extract data: ${error?.message}`);
        }
    }

    private getMainContent(dto: { html: string; options?: { mainContentSelector?: string; isChildren?: boolean } }): string {
        const { html, options } = dto;

        if (!options?.mainContentSelector) return html;

        try {
            const $ = cheerio.load(html);
            const mainContent = options?.isChildren ? $(options.mainContentSelector).parent() : $(options.mainContentSelector);

            // Get outer html
            const outterHTML = mainContent.length > 0 ? $.html(mainContent.get(0)) : $.html(mainContent);
            return outterHTML || '';
        } catch (error) {
            return null;
        }
    }

    private transformHtmlContent(htmlContent: string): string {
        if (!htmlContent) return '';
        try {
            const $ = cheerio.load(htmlContent);
            const bodyContent = $('html');

            // Remove all style tags, CSS link tags
            bodyContent.find('style').remove();
            bodyContent.find('link[rel="icon"]').remove();
            bodyContent.find('link[rel="stylesheet"]').remove();

            return bodyContent.html() ? bodyContent.html().replace(/\n/g, '').trim() : htmlContent;
        } catch (error) {
            return htmlContent;
        }
    }

    private transformFunction(functionString: string): string {
        if (!functionString) return '';
        return functionString
            .replace(/```javascript/g, '')
            .replace(/```/g, '')
            .trim();
    }
}
