import { Injectable } from '@nestjs/common';

import { ScrapingDataEntity } from '../entities/scraping-data.entity';
import { DataProviderFeatureType } from '../enums';

@Injectable()
export class UrlResolverHelper {
    static resolveUrl(entity: ScrapingDataEntity): string {
        if (!entity) return '';
        if (entity.cloudDataUrl) {
            return entity.cloudDataUrl;
        }

        const rawUrl = entity.url || '';
        if (!rawUrl) return '';

        const dataProvider = entity.dataProvider;
        const scrapingFeature = dataProvider?.features?.find((f) => f.type === DataProviderFeatureType.SCRAPING);
        const config = scrapingFeature?.config || {};

        const baseUrl = (config.mediaBaseUrl || config.baseUrl || dataProvider?.baseUrl || '') as string;

        // If template is provided in feature config
        if (config.urlTemplate && typeof config.urlTemplate === 'string') {
            return this.interpolateTemplate(config.urlTemplate, {
                baseUrl,
                mediaBaseUrl: (config.mediaBaseUrl || baseUrl) as string,
                path: rawUrl.replace(/^\/+/, ''),
                dataId: entity.dataId || '',
                itemId: entity.itemId || '',
            });
        }

        // If rawUrl is already absolute (http:// or https://)
        if (/^https?:\/\//i.test(rawUrl)) {
            if (config.domainOverrides && typeof config.domainOverrides === 'object') {
                for (const [oldDomain, newDomain] of Object.entries(config.domainOverrides)) {
                    if (rawUrl.includes(oldDomain)) {
                        return rawUrl.replace(oldDomain, newDomain as string);
                    }
                }
            }
            return rawUrl;
        }

        // If rawUrl is relative and baseUrl exists
        if (baseUrl) {
            const cleanBase = baseUrl.replace(/\/+$/, '');
            const cleanPath = rawUrl.replace(/^\/+/, '');
            return `${cleanBase}/${cleanPath}`;
        }

        return rawUrl;
    }

    private static interpolateTemplate(template: string, vars: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result.replace(/([^:]\/)\/+/g, '$1');
    }
}
