import { ApiProperty } from '@nestjs/swagger';

import { DiscoverySessionDto } from '../discovery-session.dto';

export class DiscoverySessionSummaryResponseDto {
    @ApiProperty({ type: () => DiscoverySessionDto })
    session: DiscoverySessionDto;

    @ApiProperty({ description: 'Total exact match URLs' })
    exactMatches: number;

    @ApiProperty({ description: 'Total partial match URLs' })
    partialMatches: number;

    @ApiProperty({ description: 'Total no match URLs' })
    noMatches: number;

    @ApiProperty({ description: 'Total URLs discovered' })
    totalDiscovered: number;

    @ApiProperty({ description: 'Total URLs queued' })
    totalQueued: number;

    constructor(data?: Partial<DiscoverySessionSummaryResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
