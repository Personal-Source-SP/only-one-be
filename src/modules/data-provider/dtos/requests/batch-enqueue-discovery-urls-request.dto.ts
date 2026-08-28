import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BatchEnqueueDiscoveryUrlsRequestDto {
    @ApiProperty({ description: 'List of discovery URL IDs to enqueue for scraping' })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('all', { each: true })
    urlIds: string[];
}
