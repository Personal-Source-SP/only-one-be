import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { IScraperRequest, IScraperResponse } from '../interfaces/scraper.interface';

@Injectable()
export class ApiContentService {
    constructor(
        private readonly logger: LoggerService,
        private readonly baseHttpService: BaseHttpService,
    ) {}

    async getHtmlContent(params: IScraperRequest): Promise<IScraperResponse> {
        const startTime = Date.now();
        const retryAttempts = params.retryAttempts || 3;
        const retryDelay = params.retryDelay || 2000;

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const config: AxiosRequestConfig = {
                    timeout: params.timeout || 30000,
                    headers: {
                        'User-Agent':
                            params.userAgent ||
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                        ...params.headers,
                    },
                };

                if (params.cookies && params.cookies.length > 0) {
                    const cookieString = params.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
                    config.headers['Cookie'] = cookieString;
                }

                const response = await this.baseHttpService.get<string>(params.url, config);

                const html = response.data;
                const title = this.extractTitleFromHtml(html);
                const currentUrl = response.request?.res?.responseUrl || params.url;

                return {
                    status: 'success',
                    html,
                    title,
                    url: currentUrl,
                    execution_time: Date.now() - startTime,
                };
            } catch (error) {
                this.logger.error(`ApiContentService.getHtmlContent attempt ${attempt} failed: ${error?.message}`);

                if (attempt === retryAttempts) {
                    return {
                        status: 'error',
                        error_code: error?.name || 'UNKNOWN_ERROR',
                        error_message: error?.message || 'Unknown error',
                        execution_time: Date.now() - startTime,
                    };
                }

                if (attempt < retryAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                }
            }
        }
    }

    private extractTitleFromHtml(html: string): string {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : '';
    }
}
