import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject } from 'class-validator';
import { StoreType } from '../../enums';
import { TelegramUploadDocumentRequest } from './telegram-request.dto';

export class StoreUploadFileRequest {
    @ApiProperty()
    @IsEnum(StoreType)
    storeType: StoreType;

    @ApiProperty()
    @IsObject()
    payload: TelegramUploadDocumentRequest;
}

export class StoreGetFileStreamRequest {
    @ApiProperty()
    @IsEnum(StoreType)
    storeType: StoreType;
}
