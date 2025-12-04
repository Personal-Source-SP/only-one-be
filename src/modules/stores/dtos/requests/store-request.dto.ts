import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsUUID } from 'class-validator';
import { StoreType } from '../../enums';
import { TelegramUploadDocumentRequest } from './telegram-request.dto';

export class StoreUploadFileRequest {
    @ApiProperty()
    @IsUUID()
    storeId: string;

    @ApiProperty()
    @IsObject()
    payload: TelegramUploadDocumentRequest;
}

export class StoreGetFileStreamRequest {
    @ApiProperty()
    @IsEnum(StoreType)
    storeType: StoreType;
}
