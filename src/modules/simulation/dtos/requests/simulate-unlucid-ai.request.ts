import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class EmailItem {
    @ApiProperty({
        description: 'The email to simulate',
        example: 'test@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The password to simulate',
        example: 'password',
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class SimulateUnlucidAiRequest {
    @ApiProperty({
        type: [EmailItem],
        description: 'The emails to simulate',
    })
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EmailItem)
    emails: EmailItem[];

    @ApiProperty({
        example: 'https://www.google.com',
        description: 'The referral link to simulate',
    })
    @IsNotEmpty()
    @IsString()
    referralLink: string;
}
