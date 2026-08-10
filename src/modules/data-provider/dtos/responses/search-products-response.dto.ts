import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IScraperRequest } from '../../interfaces/scraper.interface';

export class DiscoveredProductDto {
    @ApiProperty({ description: 'URL sản phẩm' })
    url: string;

    @ApiProperty({ description: 'Tiêu đề sản phẩm' })
    title: string;

    @ApiProperty({ description: 'Độ tin cậy khớp tên (0-1)' })
    confidence: number;

    @ApiPropertyOptional({ description: 'Giá sản phẩm' })
    price?: string;

    @ApiPropertyOptional({ description: 'Đơn vị tiền tệ' })
    currency?: string;

    @ApiPropertyOptional({ description: 'URL hình ảnh' })
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'URL tương đối' })
    relativeUrl?: string;

    constructor(data?: Partial<DiscoveredProductDto>) {
        if (data) Object.assign(this, data);
    }
}

export class SearchProductsResponseDto {
    @ApiProperty() searchQuery: string;
    @ApiProperty() dataProviderId: string;
    @ApiProperty() status: 'success' | 'error';
    @ApiPropertyOptional() html?: string;
    @ApiPropertyOptional() searchUrl?: string;
    @ApiPropertyOptional() totalResults?: number;
    @ApiPropertyOptional() executionTime?: number;
    @ApiPropertyOptional() request?: IScraperRequest;
    @ApiPropertyOptional({ type: [DiscoveredProductDto] }) discoveredProducts?: DiscoveredProductDto[];
    @ApiPropertyOptional() error?: string;

    constructor(data?: Partial<SearchProductsResponseDto>) {
        if (data) Object.assign(this, data);
    }
}

export class ValidateSearchConfigurationResponseDto {
    @ApiProperty() status: 'success' | 'error';
    @ApiPropertyOptional() resultCount?: number;
    @ApiPropertyOptional() executionTime?: number;
    @ApiPropertyOptional({ type: [DiscoveredProductDto] }) sampleResults?: DiscoveredProductDto[];
    @ApiPropertyOptional() error?: string;

    constructor(data?: Partial<ValidateSearchConfigurationResponseDto>) {
        if (data) Object.assign(this, data);
    }
}

export class ExtractSearchResultsResponse {
    html?: string;
    error?: string;
    discoveredProducts?: DiscoveredProductDto[];

    constructor(data?: Partial<ExtractSearchResultsResponse>) {
        if (data) Object.assign(this, data);
    }
}
