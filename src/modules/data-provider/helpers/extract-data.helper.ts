import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

import { IRunFunctionExtractData, IRunApiFunctionExtractData } from '../interfaces/target-config.interface';
import axios from 'axios';

@Injectable()
class ExtractDataHelper {
    async runFunctionExtractData(dto: IRunFunctionExtractData): Promise<Record<string, any>> {
        const { functionGenerator, htmlContent, mainContentSelector, isGetParentElement } = dto;

        try {
            const extractData = new Function(
                'cheerio',
                `return (html) => {
                    ${this.transformFunction(functionGenerator)}
                    return extractData(html);
                }`,
            )(cheerio);

            const htmlContentTransformed = this.transformHtmlContent(htmlContent);
            const mainContent = this.getMainContent({
                html: htmlContentTransformed,
                options: { mainContentSelector, isChildren: isGetParentElement },
            });
            if (!mainContent) throw new Error(`Main content not found for selector: ${mainContentSelector}`);

            const result = extractData(mainContent);

            return result;
        } catch (error) {
            console.error('Error run function extract data:', error?.message);
            throw new Error(`Error run function extract data: ${error?.message}`);
        }
    }

    async runApiFunctionExtractData(dto: IRunApiFunctionExtractData): Promise<Record<string, any>> {
        const { functionGenerator, data } = dto;

        if (!functionGenerator) {
            throw new Error('Function generator is required');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Data must be a valid object');
        }

        try {
            const extractData = new Function(
                'data',
                'axios',
                `return (data, axios) => {
                    ${this.transformFunction(functionGenerator)}
                    return extractData(data, axios);
                }`,
            )(data, axios);

            const result = await extractData(data, axios);

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
        return functionString.replace('```javascript', '').replace('```', '').trim();
    }

    private transformHtmlContent(htmlContent: string): string {
        try {
            const $ = cheerio.load(htmlContent);
            const bodyContent = $('html');

            // Remove all style tags, CSS link tags
            bodyContent.find('style').remove();
            bodyContent.find('link[rel="icon"]').remove();
            bodyContent.find('link[rel="stylesheet"]').remove();

            return bodyContent.html().replace(/\n/g, '').trim();
        } catch (error) {
            return null;
        }
    }
}

export { ExtractDataHelper };
