import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';

import { ApiFetcherService } from '../../../../shared/services/api-fetcher.service';
import { ExtractSearchDataHelper } from '../../helpers/extract-search-data.helper';
import { IDataProviderSearchService, IGetExtractSearchDataRequest, ISearchExtractDataResponse } from '../../interfaces';

@Injectable()
export class ApiDataProviderSearchService implements IDataProviderSearchService {
    constructor(
        private readonly apiFetcherService: ApiFetcherService,
        private readonly extractSearchDataHelper: ExtractSearchDataHelper,
    ) {}

    async getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse> {
        const { targetConfig, dataContent, url } = request;
        const { functionGenerator, maxResults } = targetConfig;

        try {
            let data = dataContent;
            if (!data) {
                const apiRes = await this.apiFetcherService.getApiContent(url, targetConfig);
                if (apiRes.status !== 'success') {
                    return { error: apiRes.error_message || `Not found data content from ${url}` };
                }
                data = apiRes.data;
            }

            const extractData = await this.extractSearchDataHelper.runApiFunctionExtractSearchData({
                data,
                functionGenerator,
                maxResults,
            });

            if (isEmpty(extractData)) {
                return { error: 'Not found extract data' };
            }

            return { data: extractData };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
