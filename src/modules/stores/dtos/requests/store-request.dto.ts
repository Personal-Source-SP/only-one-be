import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { StoreType } from '../../enums';
import { TelegramUploadDocumentRequest } from './telegram-request.dto';

export class CreateStoreRequest {
    @ApiProperty()
    @IsString()
    @AutoMap()
    name: string;

    @ApiProperty({ enum: StoreType })
    @IsEnum(StoreType)
    @AutoMap()
    type: StoreType;

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

export class UpdateStoreRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @AutoMap()
    name?: string;

    @ApiPropertyOptional({ enum: StoreType })
    @IsOptional()
    @IsEnum(StoreType)
    @AutoMap()
    type?: StoreType;

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

export class StoreUploadFileRequest {
    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    payload?: TelegramUploadDocumentRequest;
}
