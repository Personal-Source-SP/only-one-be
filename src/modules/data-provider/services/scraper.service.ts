import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { IScraperRequest, IScraperResponse, IScraperScreenshotResponse } from '../interfaces/scraper.interface';

@Injectable()
export class ScraperService {
    constructor(
        private readonly logger: LoggerService,
        private readonly httpService: BaseHttpService,
        private readonly configService: AppConfigService,
    ) {}

    async getHtmlContent(params: IScraperRequest): Promise<IScraperResponse> {
        try {
            const url = `${this.configService.scraperConfig.url}/get-url`;
            const response = await this.httpService.get<IScraperResponse>(url, {
                params: {
                    ...params,
                    disable_cache: true,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Secret': this.configService.scraperConfig.secretKey,
                },
            });

            if (response?.data?.status === 'error') {
                return {
                    ...response?.data,
                    error_message: this.parseErrorMessage(response?.data?.error_code),
                };
            }

            return response?.data;
        } catch (error) {
            this.logger.error(error);
            return {
                status: 'error',
                error_code: error?.status,
                error_message: error?.message ?? 'Unknown error',
            };
        }
    }

    async screenshotContent(params: IScraperRequest): Promise<IScraperScreenshotResponse> {
        try {
            const url = `${this.configService.scraperConfig.url}/get-url`;
            const response = await this.httpService.get<IScraperResponse>(url, {
                params,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Secret': this.configService.scraperConfig.secretKey,
                },
                timeout: 120000, // 2 minutes timeout
            });

            if (response?.data?.status === 'error') {
                return {
                    ...response?.data,
                    error_message: this.parseErrorMessage(response?.data?.error_code),
                };
            }

            return response?.data;
        } catch (error) {
            this.logger.error(error);
            return {
                status: 'error',
                error_code: error?.status,
                error_message: error?.message ?? 'Unknown error',
            };
        }
    }

    private parseErrorMessage(errorCode: string): string {
        switch (errorCode) {
            case '400':
                return 'Missing URL';
            case '404':
                return 'Selector Not Found';
            case '504':
                return 'Request Timeout';
            case '502':
                return 'Network Error or Proxy Error';
            case '500':
                return 'Internal Server Error or Browser Error';
            default:
                return 'Unknown Error';
        }
    }
}
