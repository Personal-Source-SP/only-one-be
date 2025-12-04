import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto';
import { MimeType } from '../../../common/enums';
import { CloudDataProviderDto } from './cloud-data-provider.dto';

export class CloudDataItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    cloudDataProviderId: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    pathId: string;

    @ApiResponseProperty()
    @AutoMap()
    pathUrl: string;

    @ApiResponseProperty()
    @AutoMap()
    fileName?: string;

    @ApiResponseProperty()
    @AutoMap()
    mimeType?: MimeType;

    @ApiResponseProperty()
    @AutoMap()
    fileSize?: number;

    @ApiResponseProperty()
    @AutoMap()
    mappingId?: string;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => CloudDataProviderDto)
    cloudDataProvider?: CloudDataProviderDto;
}
