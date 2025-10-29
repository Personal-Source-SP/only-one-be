import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { FileTagDto } from '../dtos/file-tag.dto';
import {
    AssignFilesToTagByIdsRequestDto,
    AssignTagsToFileByIdsRequestDto,
    RemoveFilesFromTagByIdsRequestDto,
    RemoveTagsFromFileByIdsRequestDto,
} from '../dtos/requests';
import { FileTagEntity } from '../entities/file-tag.entity';
import { FileTagService } from '../services/file-tag.service';

@Controller('file-tag')
@ApiTags('file-tag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileTagController extends BaseController<FileTagEntity, FileTagDto> {
    constructor(private readonly fileTagService: FileTagService) {
        super(fileTagService);
    }

    @ApiOperation({ summary: 'Assign tags to file (by ids)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('assign-tags-to-file')
    @ApiOkResponse({ type: Boolean })
    public async assignTagsToFile(@Body() request: AssignTagsToFileByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.assignTagsToFile(request);
        return result;
    }

    @ApiOperation({ summary: 'Remove tags from file (by ids)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('remove-tags-from-file')
    @ApiOkResponse({ type: Boolean })
    public async removeTagsFromFile(@Body() request: RemoveTagsFromFileByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.removeTagsFromFile(request);
        return result;
    }

    @ApiOperation({ summary: 'Assign files to tag (by ids)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('assign-files-to-tag')
    @ApiOkResponse({ type: Boolean })
    public async assignFilesToTag(@Body() request: AssignFilesToTagByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.assignFilesToTag(request);
        return result;
    }

    @ApiOperation({ summary: 'Remove files from tag (by ids)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('remove-files-from-tag')
    @ApiOkResponse({ type: Boolean })
    public async removeFilesFromTag(@Body() request: RemoveFilesFromTagByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.removeFilesFromTag(request);
        return result;
    }
}
