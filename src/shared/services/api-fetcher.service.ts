import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

import { IScraperResponse, ITargetConfig } from '../../modules/data-provider/interfaces';
import { BaseHttpService } from './base-http.service';
import { LoggerService } from './logger.service';

@Injectable()
export class ApiFetcherService {
    private readonly loggerService: LoggerService = new LoggerService(ApiFetcherService.name);

    constructor(private readonly baseHttpService: BaseHttpService) {}

    async getApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse> {
        const {
            retryAttempts = 3,
            retryDelay = 2000,
            timeout = 30000,
            userAgent,
            headers,
            cookies,
            queryParams,
            firstQueryParams,
        } = targetConfig || {};

        const startTime = Date.now();

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const config: AxiosRequestConfig = {
                    timeout,
                    headers: {
                        'User-Agent':
                            userAgent ||
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                        ...headers,
                    },
                };

                if (cookies && cookies.length > 0) {
                    const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
                    config.headers['Cookie'] = cookieString;
                }

                const params = lastScrapedTimestamp ? queryParams : (firstQueryParams ?? queryParams);
                const requestUrl = params ? `${url}${params}` : url;
                const response = await this.baseHttpService.get<Record<string, any>>(requestUrl, config);

                return {
                    status: 'success',
                    data: response.data,
                    execution_time: Date.now() - startTime,
                };
            } catch (error) {
                this.loggerService.error(`Get api content attempt ${attempt} failed: ${error?.message}`);

                if (attempt === retryAttempts) {
                    return {
                        status: 'error',
                        execution_time: Date.now() - startTime,
                        error_code: error?.name || 'UNKNOWN_ERROR',
                        error_message: error?.message || 'Unknown error',
                    };
                }

                if (attempt < retryAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                }
            }
        }
    }

    async fetchApiContent(url: string, targetConfig: ITargetConfig, lastScrapedTimestamp?: Date): Promise<IScraperResponse> {
        return this.getApiContent(url, targetConfig, lastScrapedTimestamp);
    }
}
