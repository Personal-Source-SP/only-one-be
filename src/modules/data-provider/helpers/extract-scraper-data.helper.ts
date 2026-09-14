import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { ScrapeItemDataResponseItemDto } from '../dtos/responses/scrape-item-data-response.dto';
import { IRunApiScraperFunctionExtractData, IRunScraperFunctionExtractData } from '../interfaces';

@Injectable()
export class ExtractScraperDataHelper {
    async runFunctionExtractData(dto: IRunScraperFunctionExtractData): Promise<ScrapeItemDataResponseItemDto[]> {
        const { functionGenerator, htmlContent, mainContentSelector, isGetParentElement } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        try {
            const transformedFn = this.transformFunction(functionGenerator);
            const runFn = new Function(
                'cheerio',
                `return (html) => {
                    ${transformedFn}
                    if (typeof extractData === 'function') {
                        return extractData(html);
                    }
                    throw new Error('extractData function is not defined');
                }`,
            )(cheerio);

            const htmlContentTransformed = this.transformHtmlContent(htmlContent);
            const mainContent = this.getMainContent({
                html: htmlContentTransformed,
                options: { mainContentSelector, isChildren: isGetParentElement },
            });
            if (!mainContent) throw new Error(`Main content not found for selector: ${mainContentSelector}`);

            const result = runFn(mainContent);

            return result;
        } catch (error) {
            console.error('Error run function extract data:', error?.message);
            throw new Error(`Error run function extract data: ${error?.message}`);
        }
    }

    async runApiFunctionExtractData(dto: IRunApiScraperFunctionExtractData): Promise<ScrapeItemDataResponseItemDto[]> {
        const { functionGenerator, data } = dto;

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
                    if (typeof extractData === 'function') {
                        return await extractData(data, axios);
                    }
                    throw new Error('extractData function is not defined');
                }`,
            )(data, axios);

            const result = await runFn(data, axios);

            if (typeof result !== 'object' || result === null) {
                throw new Error('Function must return an object');
            }

            return result;
        } catch (error) {
            console.error('Error run API function extract data:', error?.message);
            throw new Error(`Error run API function extract data: ${error?.message}`);
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

    private transformFunction(functionString: string): string {
        if (!functionString) return '';
        return functionString
            .replace(/```(?:javascript|typescript|js|ts)?/gi, '')
            .replace(/```/g, '')
            .trim();
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
}
