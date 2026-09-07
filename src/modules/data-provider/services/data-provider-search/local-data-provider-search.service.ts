import { Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';

import { IDataProviderSearchService, IGetExtractSearchDataRequest, ISearchExtractDataResponse } from '../../interfaces';

@Injectable()
export class LocalDataProviderSearchService implements IDataProviderSearchService {
    async getExtractSearchData(request: IGetExtractSearchDataRequest): Promise<ISearchExtractDataResponse> {
        const { dataContent, targetConfig } = request;
        const { maxResults } = targetConfig;

        try {
            const data = dataContent;
            const extractData = Array.isArray(data) ? data : data ? [data] : [];

            if (isEmpty(extractData)) {
                return { error: 'Not found extract data' };
            }

            if (maxResults && extractData.length > maxResults) {
                return { data: extractData.slice(0, maxResults) };
            }

            return { data: extractData };
        } catch (error) {
            console.error(error);
            return { error: error?.message || 'Unknown error' };
        }
    }
}
