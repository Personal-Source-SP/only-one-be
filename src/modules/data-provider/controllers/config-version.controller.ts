import { Controller, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, DeleteRestApi, GetRestApi, PostRestApi, User, UUIDParam } from '../../../decorators';
import { ConfigVersionDto } from '../dtos/config-version.dto';
import { ConfigVersionService } from '../services/config-version.service';

@Controller('data-provider-features')
@ApiTags('Config Versions')
@Auth()
export class ConfigVersionController {
    constructor(private readonly configVersionService: ConfigVersionService) {}

    @GetRestApi({
        path: ':id/versions',
        summary: 'Get version history for feature',
        responseDto: ConfigVersionDto,
        isArray: true,
    })
    async getVersions(@UUIDParam('id') id: string): Promise<ConfigVersionDto[]> {
        return await this.configVersionService.getConfigVersionOptionsByFeature(id);
    }

    @PostRestApi({
        path: ':id/versions/:versionId/rollback',
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

    @DeleteRestApi({
        path: ':id/versions/:versionId',
        summary: 'Delete inactive feature version',
        responseDto: Boolean,
    })
    async deleteVersion(@UUIDParam('id') id: string, @Param('versionId', ParseIntPipe) versionId: number): Promise<boolean> {
        return await this.configVersionService.deleteConfigVersionByFeature(id, versionId);
    }
}
