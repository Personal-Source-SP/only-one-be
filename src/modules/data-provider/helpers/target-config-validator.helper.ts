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

        if (config.retryAttempts !== undefined && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryAttempts phải là số nguyên không âm.'));
        }

        if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || config.retryDelay < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('retryDelay phải là số không âm.'));
        }

        if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('timeout phải là số dương (> 0).'));
        }

        if (config.waitForTimeout !== undefined && (typeof config.waitForTimeout !== 'number' || config.waitForTimeout < 0)) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('waitForTimeout phải là số không âm.'));
        }

        if (config.cookies !== undefined) {
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

        if (config.headers !== undefined && (typeof config.headers !== 'object' || Array.isArray(config.headers))) {
            throw new AppException(DataProviderError.InvalidFeatureConfig('headers phải là một đối tượng key-value.'));
        }

        return config as IScrapingTargetConfig;
    }

    static validateSearchTargetConfig(rawConfig: unknown): ISearchTargetConfig {
        const baseConfig = this.validateScrapingTargetConfig(rawConfig);
        const searchConfig = rawConfig as Partial<ISearchTargetConfig>;

        if (searchConfig.searchUrlPattern !== undefined && typeof searchConfig.searchUrlPattern !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('searchUrlPattern phải là chuỗi ký tự.'));
        }

        if (searchConfig.queryPlaceholder !== undefined && typeof searchConfig.queryPlaceholder !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('queryPlaceholder phải là chuỗi ký tự.'));
        }

        if (searchConfig.resultSelector !== undefined && typeof searchConfig.resultSelector !== 'string') {
            throw new AppException(DataProviderError.InvalidFeatureConfig('resultSelector phải là chuỗi ký tự.'));
        }

        return {
            ...baseConfig,
            searchUrlPattern: searchConfig.searchUrlPattern,
            queryPlaceholder: searchConfig.queryPlaceholder,
            resultSelector: searchConfig.resultSelector,
        };
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
