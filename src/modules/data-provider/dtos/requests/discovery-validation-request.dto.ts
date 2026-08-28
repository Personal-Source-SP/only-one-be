import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { ValidationUserAction } from '../../enums';

export class TriggerValidationRequestDto {
    @ApiPropertyOptional({ description: 'Target keyword/product name to match against' })
    @IsString()
    @IsOptional()
    targetKeyword?: string;
}

export class SubmitUserActionRequestDto {
    @ApiProperty({ enum: ValidationUserAction, description: 'User action on URL' })
    @IsEnum(ValidationUserAction)
    @IsNotEmpty()
    action: ValidationUserAction;

    @ApiPropertyOptional({ description: 'Reason for action' })
    @IsString()
    @IsOptional()
    reason?: string;
}

export class SubmitBulkUserActionRequestDto {
    @ApiProperty({ description: 'List of Discovery URL IDs' })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('all', { each: true })
    urlIds: string[];

    @ApiProperty({ enum: ValidationUserAction, description: 'User action on URLs' })
    @IsEnum(ValidationUserAction)
    @IsNotEmpty()
    action: ValidationUserAction;

    @ApiPropertyOptional({ description: 'Reason for action' })
    @IsString()
    @IsOptional()
    reason?: string;
}

export class RevalidateUrlRequestDto {
    @ApiPropertyOptional({ description: 'Target keyword for revalidation' })
    @IsString()
    @IsOptional()
    targetKeyword?: string;
}

export class CancelValidationBatchRequestDto {
    @ApiPropertyOptional({ description: 'Reason for cancellation' })
    @IsString()
    @IsOptional()
    reason?: string;
}
