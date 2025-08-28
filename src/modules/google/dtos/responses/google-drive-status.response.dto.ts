import { ApiProperty } from '@nestjs/swagger';

export class GoogleDriveStatusResponseDto {
    @ApiProperty({ description: 'Whether user has authorized Google Drive access' })
    isAuthorized: boolean;

    @ApiProperty({ description: 'Token expiration date', required: false })
    tokenExpiresAt?: Date;

    @ApiProperty({ description: 'Whether token is expired' })
    isTokenExpired: boolean;

    @ApiProperty({ description: 'Total files synced' })
    totalFilesSynced: number;

    @ApiProperty({ description: 'Last sync timestamp', required: false })
    lastSyncAt?: Date;

    @ApiProperty({ description: 'Sync status' })
    syncStatus: 'idle' | 'syncing' | 'error';
}
