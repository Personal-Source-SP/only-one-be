import { createMap, forMember, mapFrom, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { ConfigVersionDto } from './dtos/config-version.dto';
import { DataProviderDto } from './dtos/data-provider.dto';
import { DataProviderFeatureDto } from './dtos/data-provider-feature.dto';
import { DataProviderItemDto } from './dtos/data-provider-item.dto';
import { DiscoverySessionDto } from './dtos/discovery-session.dto';
import { DiscoveryUrlDto } from './dtos/discovery-url.dto';
import { DiscoveryValidationBatchDto } from './dtos/discovery-validation-batch.dto';
import { DiscoveryValidationLogDto } from './dtos/discovery-validation-log.dto';
import { ItemDto } from './dtos/item.dto';
import {
    CreateConfigVersionRequestDto,
    CreateDataProviderFeatureRequestDto,
    CreateDataProviderItemRequestDto,
    CreateDataProviderRequestDto,
    CreateDiscoverySessionRequestDto,
    CreateItemRequestDto,
    CreateScrapingDataRequestDto,
    UpdateDataProviderItemRequestDto,
    UpdateDataProviderRequestDto,
    UpdateItemRequestDto,
} from './dtos/requests';
import { ScrapingDataDto } from './dtos/scraping-data.dto';
import { ConfigVersionEntity } from './entities/config-version.entity';
import { DataProviderEntity } from './entities/data-provider.entity';
import { DataProviderFeatureEntity } from './entities/data-provider-feature.entity';
import { DataProviderItemEntity } from './entities/data-provider-item.entity';
import { DiscoverySessionEntity } from './entities/discovery-session.entity';
import { DiscoveryUrlEntity } from './entities/discovery-url.entity';
import { DiscoveryValidationBatchEntity } from './entities/discovery-validation-batch.entity';
import { DiscoveryValidationLogEntity } from './entities/discovery-validation-log.entity';
import { ItemEntity } from './entities/item.entity';
import { ScrapingDataEntity } from './entities/scraping-data.entity';
import { DiscoverySessionStatus } from './enums';
import { UrlResolverHelper } from './helpers/url-resolver.helper';

@Injectable()
export class DataProviderProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            this.mapDataProvider(mapper);
            this.mapDataProviderFeature(mapper);
            this.mapDataProviderItem(mapper);
            this.mapScrapingData(mapper);
            this.mapItem(mapper);
            this.mapConfigVersion(mapper);
            this.mapDiscoverySession(mapper);
            this.mapDiscoveryUrl(mapper);
            this.mapDiscoveryValidationBatch(mapper);
            this.mapDiscoveryValidationLog(mapper);
        };
    }

    private mapDataProvider(mapper: Mapper): void {
        createMap(mapper, DataProviderEntity, DataProviderDto);
        createMap(mapper, CreateDataProviderRequestDto, DataProviderEntity);
        createMap(mapper, UpdateDataProviderRequestDto, DataProviderEntity);
    }

    private mapDataProviderFeature(mapper: Mapper): void {
        createMap(
            mapper,
            DataProviderFeatureEntity,
            DataProviderFeatureDto,
            forMember(
                (d) => d.config,
                mapFrom((s) => s.config),
            ),
        );
        createMap(mapper, CreateDataProviderFeatureRequestDto, DataProviderFeatureEntity);
    }

    private mapDataProviderItem(mapper: Mapper): void {
        createMap(mapper, DataProviderItemEntity, DataProviderItemDto);
        createMap(mapper, CreateDataProviderItemRequestDto, DataProviderItemEntity);
        createMap(mapper, UpdateDataProviderItemRequestDto, DataProviderItemEntity);
    }

    private mapScrapingData(mapper: Mapper): void {
        createMap(
            mapper,
            ScrapingDataEntity,
            ScrapingDataDto,
            forMember(
                (d) => d.url,
                mapFrom((s) => UrlResolverHelper.resolveUrl(s)),
            ),
        );
        createMap(
            mapper,
            CreateScrapingDataRequestDto,
            ScrapingDataEntity,
            forMember(
                (d) => d.scrapeTimestamp,
                mapFrom(() => new Date()),
            ),
        );
    }

    private mapItem(mapper: Mapper): void {
        createMap(mapper, ItemEntity, ItemDto);
        createMap(mapper, ItemDto, ItemEntity);
        createMap(mapper, CreateItemRequestDto, ItemEntity);
        createMap(mapper, UpdateItemRequestDto, ItemEntity);
    }

    private mapConfigVersion(mapper: Mapper): void {
        createMap(
            mapper,
            ConfigVersionEntity,
            ConfigVersionDto,
            forMember(
                (d) => d.config,
                mapFrom((s) => s.config),
            ),
        );
        createMap(mapper, CreateConfigVersionRequestDto, ConfigVersionEntity);
    }

    private mapDiscoverySession(mapper: Mapper): void {
        createMap(mapper, DiscoverySessionEntity, DiscoverySessionDto);
        createMap(
            mapper,
            CreateDiscoverySessionRequestDto,
            DiscoverySessionEntity,
            forMember(
                (d) => d.status,
                mapFrom(() => DiscoverySessionStatus.PENDING),
            ),
            forMember(
                (d) => d.depth,
                mapFrom((s) => s.depth || 1),
            ),
            forMember(
                (d) => d.maxUrls,
                mapFrom((s) => (s.maxUrls !== undefined ? s.maxUrls : null)),
            ),
            forMember(
                (d) => d.autoValidate,
                mapFrom((s) => (s.autoValidate !== undefined ? s.autoValidate : true)),
            ),
            forMember(
                (d) => d.totalDiscovered,
                mapFrom(() => 0),
            ),
            forMember(
                (d) => d.totalQueued,
                mapFrom(() => 0),
            ),
            forMember(
                (d) => d.totalValidated,
                mapFrom(() => 0),
            ),
        );
    }

    private mapDiscoveryUrl(mapper: Mapper): void {
        createMap(mapper, DiscoveryUrlEntity, DiscoveryUrlDto);
    }

    private mapDiscoveryValidationBatch(mapper: Mapper): void {
        createMap(mapper, DiscoveryValidationBatchEntity, DiscoveryValidationBatchDto);
    }

    private mapDiscoveryValidationLog(mapper: Mapper): void {
        createMap(mapper, DiscoveryValidationLogEntity, DiscoveryValidationLogDto);
    }
}
