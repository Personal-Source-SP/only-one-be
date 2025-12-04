import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { CloudDataProviderType } from '../../enums';
import { TelegramUploadDocumentRequest } from './telegram-request.dto';

export class CreateCloudDataProviderRequest {
    @ApiProperty()
    @IsString()
    @AutoMap()
    name: string;

    @ApiProperty({ enum: CloudDataProviderType })
    @IsEnum(CloudDataProviderType)
    @AutoMap()
    type: CloudDataProviderType;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;
}

export class UpdateCloudDataProviderRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    name?: string;

    @ApiPropertyOptional({ enum: CloudDataProviderType })
    @IsOptional()
    @IsEnum(CloudDataProviderType)
    @AutoMap()
    type?: CloudDataProviderType;

    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;
}

export class CloudDataUploadFileRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    payload?: TelegramUploadDocumentRequest;
}
