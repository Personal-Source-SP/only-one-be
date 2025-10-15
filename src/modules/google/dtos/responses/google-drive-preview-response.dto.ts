import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

export class GoogleDrivePreviewItem {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    googleDriveId: string;

    @ApiResponseProperty()
    @AutoMap()
    mimeType?: string;

    @ApiResponseProperty()
    @AutoMap()
    size?: number;

    @ApiResponseProperty()
    @AutoMap()
    webViewLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    webContentLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    thumbnailLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    parentFolderId?: string;

    @ApiResponseProperty()
    @AutoMap()
    lastModified?: Date;

    @ApiResponseProperty()
    @AutoMap()
    isTrashed?: boolean;

    @ApiResponseProperty()
    @AutoMap()
    isStarred?: boolean;

    constructor(data: Partial<GoogleDrivePreviewItem>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class GoogleDrivePreviewResponse {
    @ApiResponseProperty()
    data: GoogleDrivePreviewItem[];

    @ApiResponseProperty()
    totalCount: number;

    @ApiResponseProperty()
    hasMore: boolean;

    @ApiResponseProperty()
    nextPageToken?: string;

    constructor(data: Partial<GoogleDrivePreviewResponse>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
