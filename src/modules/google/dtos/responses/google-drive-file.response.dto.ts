import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

import { MimeType } from '../../../../common/enums';

export class GoogleDriveFileResponseDto {
    @ApiProperty({ description: 'File ID' })
    @AutoMap()
    id: string;

    @ApiProperty({ description: 'Google Drive ID' })
    @AutoMap()
    googleDriveId: string;

    @ApiProperty({ description: 'File name' })
    @AutoMap()
    name: string;

    @ApiProperty({ description: 'MIME type' })
    @AutoMap()
    mimeType: MimeType;

    @ApiProperty({ description: 'File size in bytes' })
    @AutoMap()
    size: number;

    @ApiProperty({ description: 'Web view link' })
    @AutoMap()
    webViewLink: string;

    @ApiProperty({ description: 'Web content link' })
    @AutoMap()
    webContentLink: string;

    @ApiProperty({ description: 'Thumbnail link' })
    @AutoMap()
    thumbnailLink: string;

    @ApiProperty({ description: 'Parent folder ID' })
    @AutoMap()
    parentFolderId: string;

    @ApiProperty({ description: 'Last modified date' })
    @AutoMap()
    lastModified: Date;

    @ApiProperty({ description: 'Last viewed date' })
    @AutoMap()
    lastViewedByMe: Date;

    @ApiProperty({ description: 'Is trashed' })
    @AutoMap()
    isTrashed: boolean;

    @ApiProperty({ description: 'Is starred' })
    @AutoMap()
    isStarred: boolean;

    @ApiProperty({ description: 'Created at' })
    @AutoMap()
    createdAt: Date;

    @ApiProperty({ description: 'Updated at' })
    @AutoMap()
    updatedAt: Date;
}
