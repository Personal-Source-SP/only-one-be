import { AutoMap } from '@automapper/classes';

import {
    BooleanFieldOptional,
    ClassFieldOptional,
    EnumField,
    EnumFieldOptional,
    ObjectFieldOptional,
    StringField,
    StringFieldOptional,
    UUIDField,
} from '../../../../decorators';
import { CloudDataProviderType } from '../../enums';
import { TelegramUploadDocumentRequest } from './telegram-request.dto';

export class CreateCloudDataProviderRequest {
    @StringField()
    @AutoMap()
    name: string;

    @EnumField(() => CloudDataProviderType)
    @AutoMap()
    type: CloudDataProviderType;

    @ObjectFieldOptional()
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @BooleanFieldOptional()
    @AutoMap()
    isActive?: boolean;
}

export class UpdateCloudDataProviderRequest {
    @StringFieldOptional()
    @AutoMap()
    name?: string;

    @EnumFieldOptional(() => CloudDataProviderType)
    @AutoMap()
    type?: CloudDataProviderType;

    @ObjectFieldOptional()
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @BooleanFieldOptional()
    @AutoMap()
    isActive?: boolean;
}

export class CloudDataUploadFileRequest {
    @UUIDField()
    cloudDataProviderId: string;

    @StringFieldOptional()
    fileUrl?: string;

    @ClassFieldOptional(() => TelegramUploadDocumentRequest)
    payload?: TelegramUploadDocumentRequest;
}
