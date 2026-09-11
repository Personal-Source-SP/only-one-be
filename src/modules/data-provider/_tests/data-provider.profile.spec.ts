import { classes } from '@automapper/classes';
import { createMapper, Mapper } from '@automapper/core';

import { DataProviderProfile } from '../data-provider.profile';
import { CreateConfigVersionRequestDto } from '../dtos/requests/config-version-request.dto';
import { CreateDataProviderFeatureRequestDto } from '../dtos/requests/data-provider-feature-request.dto';
import { ConfigVersionEntity } from '../entities/config-version.entity';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { ConfigVersionType, DataProviderFeatureType, ScraperServiceEnum } from '../enums';

describe('DataProviderProfile', () => {
    let mapper: Mapper;

    beforeEach(() => {
        mapper = createMapper({
            strategyInitializer: classes(),
        });
        const profile = new DataProviderProfile(mapper);
        profile.profile(mapper);
    });

    it('should correctly map config property from CreateConfigVersionRequestDto to ConfigVersionEntity', () => {
        const dto = new CreateConfigVersionRequestDto({
            featureId: 'deb65a15-2f1e-4077-8477-da39c55eac47',
            isActive: true,
            config: { sampleUrl: 'https://example.com/item' },
            changeType: ConfigVersionType.MANUAL_EDIT,
            changeDescription: 'Updated config',
        });

        const entity = mapper.map(dto, CreateConfigVersionRequestDto, ConfigVersionEntity);

        expect(entity).toBeDefined();
        expect(entity.featureId).toBe('deb65a15-2f1e-4077-8477-da39c55eac47');
        expect(entity.config).toEqual({ sampleUrl: 'https://example.com/item' });
        expect(entity.isActive).toBe(true);
        expect(entity.changeType).toBe(ConfigVersionType.MANUAL_EDIT);
    });

    it('should correctly map config property from CreateDataProviderFeatureRequestDto to DataProviderFeatureEntity', () => {
        const dto = new CreateDataProviderFeatureRequestDto();
        dto.dataProviderId = 'deb65a15-2f1e-4077-8477-da39c55eac47';
        dto.type = DataProviderFeatureType.SCRAPING;
        dto.service = ScraperServiceEnum.GENERIC;
        dto.config = { sampleUrl: 'https://example.com/feature' };

        const entity = mapper.map(dto, CreateDataProviderFeatureRequestDto, DataProviderFeatureEntity);

        expect(entity).toBeDefined();
        expect(entity.dataProviderId).toBe('deb65a15-2f1e-4077-8477-da39c55eac47');
        expect(entity.type).toBe(DataProviderFeatureType.SCRAPING);
        expect(entity.service).toBe(ScraperServiceEnum.GENERIC);
        expect(entity.config).toEqual({ sampleUrl: 'https://example.com/feature' });
    });
});
