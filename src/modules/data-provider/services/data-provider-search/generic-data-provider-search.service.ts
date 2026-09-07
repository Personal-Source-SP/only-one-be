import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';

import { ExtractSearchDataHelper } from '../../helpers/extract-search-data.helper';
import { IDataProviderSearchService, IGetExtractSearchDataRequest, ISearchExtractDataResponse } from '../../interfaces';
import { ScraperService } from '../scraper.service';

@Injectable()
export class GenericDataProviderSearchService implements IDataProviderSearchService {
    constructor(
        private readonly scraperService: ScraperService,
        private readonly extractSearchDataHelper: ExtractSearchDataHelper,
    ) {}

    async getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse> {
        const { targetConfig, url, htmlContentString } = request;
        const { functionGenerator, resultSelector, maxResults } = targetConfig;

        try {
            let html = htmlContentString;
            if (!html) {
                const htmlContent = await this.scraperService.getHtmlContent(url, targetConfig);
                if (htmlContent.status !== 'success') {
                    return { error: htmlContent.error_message || `Not found html content from ${url}` };
                }
                html = htmlContent.html;
            }

            const extractData = await this.extractSearchDataHelper.runFunctionExtractSearchData({
                htmlContent: html,
                functionGenerator,
                resultSelector,
                maxResults,
            });

            if (isEmpty(extractData)) {
                return { error: 'Not found extract data', html };
            }

            return { data: extractData, html };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
