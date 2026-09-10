import { isNil } from 'lodash';
import { AppException } from '../../../exceptions/app.exception';
import { DataProviderError } from '../constants/data-provider-error';
import { DataProviderFeatureType } from '../enums';
import { IScrapingTargetConfig, ISearchTargetConfig, TargetConfig } from '../interfaces';

export class TargetConfigValidatorHelper {
    static validateScrapingTargetConfig(rawConfig: unknown): IScrapingTargetConfig {
        if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('Cấu hình tính năng bắt buộc phải là một đối tượng JSON.'));
        }

        const config = rawConfig as Partial<IScrapingTargetConfig>;

        if (!config.functionGenerator || typeof config.functionGenerator !== 'string' || !config.functionGenerator.trim()) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('Trường functionGenerator là bắt buộc và không được để trống.'));
        }

        try {
            new Function('html', 'cheerio', 'axios', config.functionGenerator);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new AppException(DataProviderError.InvalidFeatureConfig(`Cú pháp hàm functionGenerator không hợp lệ: ${message}`));
        }

        if (!isNil(config.maxResults) && (typeof config.maxResults !== 'number' || config.maxResults <= 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('maxResults phải là số nguyên dương (> 0).'));
        }

        if (!isNil(config.retryAttempts) && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryAttempts phải là số nguyên không âm.'));
        }

        if (!isNil(config.retryDelay) && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryDelay phải là số không âm.'));
        }

        if (!isNil(config.timeout) && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('timeout phải là số dương (> 0).'));
        }

        if (!isNil(config.waitForTimeout) && (typeof config.waitForTimeout !== 'number' || config.waitForTimeout < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('waitForTimeout phải là số không âm.'));
        }

        const booleanFields: (keyof IScrapingTargetConfig)[] = [
            'isGetParentElement',
            'stealthMode',
            'cloudflareBypass',
            'javascriptEnabled',
            'imagesEnabled',
            'cssEnabled',
        ];
        for (const field of booleanFields) {
            if (!isNil(config[field]) && typeof config[field] !== 'boolean') {
                throw new AppException(DataProviderError.InvalidFeatureConfig(`${String(field)} phải là kiểu boolean.`));
            }
        }

        const stringFields: (keyof IScrapingTargetConfig)[] = [
            'mainContentSelector',
            'waitForSelector',
            'userAgent',
            'queryParams',
            'firstQueryParams',
        ];
        for (const field of stringFields) {
            if (!isNil(config[field]) && typeof config[field] !== 'string') {
                throw new AppException(DataProviderError.InvalidFeatureConfig(`${String(field)} phải là chuỗi ký tự.`));
            }
        }

        if (!isNil(config.cookies)) {
            if (!Array.isArray(config.cookies)) {
                throw new AppException(DataProviderError.InvalidFeatureConfig('cookies phải là một mảng.'));
            }
            for (let i = 0; i < config.cookies.length; i++) {
                const cookie = config.cookies[i];
                if (!cookie || typeof cookie !== 'object' || !cookie.name || !cookie.value) {
                    throw new AppException(DataProviderError.InvalidFeatureConfig(`Cookie tại vị trí ${i} phải có đầy đủ name và value.`));
                }
            }
        }

        if (!isNil(config.headers) && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('headers phải là một đối tượng key-value.'));
        }

        const sanitizedConfig: IScrapingTargetConfig = {
            functionGenerator: config.functionGenerator,
            ...(!isNil(config.mainContentSelector) ? { mainContentSelector: config.mainContentSelector } : {}),
            ...(!isNil(config.isGetParentElement) ? { isGetParentElement: config.isGetParentElement } : {}),
            ...(!isNil(config.queryParams) ? { queryParams: config.queryParams } : {}),
            ...(!isNil(config.firstQueryParams) ? { firstQueryParams: config.firstQueryParams } : {}),
            ...(!isNil(config.maxResults) ? { maxResults: config.maxResults } : {}),
            ...(!isNil(config.retryDelay) ? { retryDelay: config.retryDelay } : {}),
            ...(!isNil(config.retryAttempts) ? { retryAttempts: config.retryAttempts } : {}),
            ...(!isNil(config.userAgent) ? { userAgent: config.userAgent } : {}),
            ...(!isNil(config.headers) ? { headers: config.headers } : {}),
            ...(!isNil(config.cookies) ? { cookies: config.cookies } : {}),
            ...(!isNil(config.timeout) ? { timeout: config.timeout } : {}),
            ...(!isNil(config.waitForTimeout) ? { waitForTimeout: config.waitForTimeout } : {}),
            ...(!isNil(config.stealthMode) ? { stealthMode: config.stealthMode } : {}),
            ...(!isNil(config.cloudflareBypass) ? { cloudflareBypass: config.cloudflareBypass } : {}),
            ...(!isNil(config.waitForSelector) ? { waitForSelector: config.waitForSelector } : {}),
            ...(!isNil(config.javascriptEnabled) ? { javascriptEnabled: config.javascriptEnabled } : {}),
            ...(!isNil(config.imagesEnabled) ? { imagesEnabled: config.imagesEnabled } : {}),
            ...(!isNil(config.cssEnabled) ? { cssEnabled: config.cssEnabled } : {}),
        };

        return sanitizedConfig;
    }

    static validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig {
        const baseConfig = this.validateScrapingTargetConfig(rawConfig);
        const searchConfig = rawConfig as Partial<ISearchTargetConfig>;

        if (!isNil(searchConfig.searchUrlPattern) && typeof searchConfig.searchUrlPattern !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('searchUrlPattern phải là chuỗi ký tự.'));
        }

        if (!isNil(searchConfig.queryPlaceholder) && typeof searchConfig.queryPlaceholder !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('queryPlaceholder phải là chuỗi ký tự.'));
        }

        if (!isNil(searchConfig.resultSelector) && typeof searchConfig.resultSelector !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('resultSelector phải là chuỗi ký tự.'));
        }

        const sanitizedSearchConfig: ISearchTargetConfig = {
            ...baseConfig,
            ...(!isNil(searchConfig.searchUrlPattern) ? { searchUrlPattern: searchConfig.searchUrlPattern } : {}),
            ...(!isNil(searchConfig.queryPlaceholder) ? { queryPlaceholder: searchConfig.queryPlaceholder } : {}),
            ...(!isNil(searchConfig.resultSelector) ? { resultSelector: searchConfig.resultSelector } : {}),
        };

        return sanitizedSearchConfig;
    }

    static validateConfig(rawConfig: unknown, type: DataProviderFeatureType): TargetConfig {
        switch (type) {
            case DataProviderFeatureType.SEARCH:
                return this.validateSearchTargetConfig(rawConfig);
            case DataProviderFeatureType.SCRAPING:
                return this.validateScrapingTargetConfig(rawConfig);
            default:
                throw new AppException(DataProviderError.InvalidFeatureConfig('Type không hợp lệ.'));
        }
    }
}
