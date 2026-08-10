import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

import { ISearchConfig, SearchOptions } from '../../interfaces/search-config.interface';

export class SearchProductsRequestDto {
    @ApiProperty({ description: 'ID của Data Provider' })
    @IsUUID()
    @IsNotEmpty()
    dataProviderId: string;

    @ApiProperty({ description: 'Từ khóa tìm kiếm' })
    @IsString()
    @IsNotEmpty()
    searchQuery: string;

    @ApiPropertyOptional({ description: 'Tùy chọn tìm kiếm' })
    @IsObject()
    @IsOptional()
    options?: SearchOptions;
}

export class TestSearchFunctionRequestDto {
    @ApiProperty({ description: 'Tên service search (ví dụ: generic)' })
    @IsString()
    @IsNotEmpty()
    searchService: string;

    @ApiProperty({ description: 'Base URL' })
    @IsString()
    @IsNotEmpty()
    baseUrl: string;

    @ApiProperty({ description: 'Từ khóa tìm kiếm mẫu' })
    @IsString()
    @IsNotEmpty()
    searchQuery: string;

    @ApiProperty({ description: 'Cấu hình search' })
    @IsObject()
    @IsNotEmpty()
    searchConfig: ISearchConfig;
}

export class UpdateSearchConfigRequestDto {
    @ApiProperty({ description: 'Cấu hình tìm kiếm mới' })
    @IsObject()
    @IsNotEmpty()
    searchConfig: ISearchConfig;

    @ApiPropertyOptional({ description: 'Bật/tắt trạng thái search' })
    @IsBoolean()
    @IsOptional()
    enableSearch?: boolean;
}
