import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { NotificationType } from '../../enum/notification.enum';

export class CreateNotificationRequest {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    title: string;

    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    @AutoMap()
    type: NotificationType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @AutoMap()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @AutoMap()
    userId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @AutoMap()
    path?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    @AutoMap()
    data?: Record<string, any>;
}
