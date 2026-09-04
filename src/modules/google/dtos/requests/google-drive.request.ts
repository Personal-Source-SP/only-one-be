import { ValidateIf } from 'class-validator';

import { MimeType } from '../../../../common/enums/mime-type';
import {
    DateFieldOptional,
    EnumField,
    EnumFieldOptional,
    NumberFieldOptional,
    StringField,
    StringFieldOptional,
    UUIDFieldOptional,
} from '../../../../decorators';
import { GoogleDriveType } from '../../enums';
import { GoogleDrivePreviewItem } from '../responses/google-drive-preview-response.dto';

export class GoogleDrivePreviewRequest {
    @EnumField(() => GoogleDriveType)
    type: GoogleDriveType;

    @StringField()
    googleAuthId: string;

    @EnumFieldOptional(() => MimeType, { each: true })
    fileTypes?: MimeType[];

    @DateFieldOptional({ description: 'Filter by modified time from (ISO string)' })
    modifiedTimeFrom?: string;

    @DateFieldOptional({ description: 'Filter by modified time to (ISO string)' })
    modifiedTimeTo?: string;

    @NumberFieldOptional({ int: true, min: 0 })
    maxResults?: number;

    @StringFieldOptional()
    folderId?: string;

    @StringFieldOptional()
    customQuery?: string;
}

export class GoogleDriveSyncRequest {
    @EnumField(() => GoogleDriveType)
    type: GoogleDriveType;

    @StringField()
    googleAuthId: string;

    @StringFieldOptional({ each: true })
    data: GoogleDrivePreviewItem[];

    @ValidateIf((object) => object.type === GoogleDriveType.FILE)
    @UUIDFieldOptional()
    folderId?: string;
}
