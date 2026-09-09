import { Controller, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Delete, Get, Post, User, UUIDParam } from '../../../decorators';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { ConfigVersionService } from '../services/config-version.service';

@Controller('config-version-features')
@ApiTags('Config Version Features')
@Auth()
export class ConfigVersionController {
    constructor(private readonly configVersionService: ConfigVersionService) {}

    @Get({
        path: ':id',
        summary: 'Get version history for feature',
        responseDto: [ConfigVersionDto],
    })
    async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
    }

    @Post({
        path: ':id/rollback/:versionId',
        summary: 'Rollback feature version',
        responseDto: Boolean,
    })
    async rollbackVersion(
        @UUIDParam('id') id: string,
        @Param('versionId', ParseIntPipe) versionId: number,
        @User() user: PayloadDto,
    ): Promise<boolean> {
        return await this.configVersionService.rollbackToVersionIdByFeature(id, versionId, user);
    }

    @Delete({
        path: ':id/:versionId',
        summary: 'Delete inactive feature version',
        responseDto: Boolean,
    })
    async deleteVersion(@UUIDParam('id') id: string, @Param('versionId', ParseIntPipe) versionId: number): Promise<boolean> {
        return await this.configVersionService.deleteConfigVersionByFeature(id, versionId);
    }
}
