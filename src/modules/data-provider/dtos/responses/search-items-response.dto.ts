import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IScraperRequest } from '../../interfaces/scraper.interface';

export class DiscoveredItemDto {
    @ApiProperty({ description: 'URL sản phẩm / item' })
    url: string;

    @ApiProperty({ description: 'Tiêu đề item' })
    title: string;

    @ApiProperty({ description: 'Độ tin cậy khớp tên (0-1)' })
    confidence: number;

    @ApiPropertyOptional({ description: 'Giá item' })
    price?: string;

    @ApiPropertyOptional({ description: 'Đơn vị tiền tệ' })
    currency?: string;

    @ApiPropertyOptional({ description: 'URL hình ảnh' })
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'URL tương đối' })
    relativeUrl?: string;

    constructor(data?: Partial<DiscoveredItemDto>) {
        if (data) Object.assign(this, data);
    }
}

export class SearchItemsResponseDto {
    @ApiProperty() searchQuery: string;
    @ApiProperty() dataProviderId: string;
    @ApiProperty() status: 'success' | 'error';
    @ApiPropertyOptional() html?: string;
    @ApiPropertyOptional() searchUrl?: string;
    @ApiPropertyOptional() totalResults?: number;
    @ApiPropertyOptional() executionTime?: number;
    @ApiPropertyOptional() request?: IScraperRequest;
    @ApiPropertyOptional({ type: [DiscoveredItemDto] }) discoveredItems?: DiscoveredItemDto[];
    @ApiPropertyOptional() error?: string;

    constructor(data?: Partial<SearchItemsResponseDto>) {
        if (data) Object.assign(this, data);
    }
}

export class ValidateSearchConfigurationResponseDto {
    @ApiProperty() status: 'success' | 'error';
    @ApiPropertyOptional() resultCount?: number;
    @ApiPropertyOptional() executionTime?: number;
    @ApiPropertyOptional({ type: [DiscoveredItemDto] }) sampleResults?: DiscoveredItemDto[];
    @ApiPropertyOptional() error?: string;

    constructor(data?: Partial<ValidateSearchConfigurationResponseDto>) {
        if (data) Object.assign(this, data);
    }
}

export class ExtractSearchResultsResponse {
    html?: string;
    error?: string;
    discoveredItems?: DiscoveredItemDto[];

    constructor(data?: Partial<ExtractSearchResultsResponse>) {
        if (data) Object.assign(this, data);
    }
}
