import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Post } from '../../../decorators';
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
@ApiTags('File Tag')
@Auth()
export class FileTagController extends BaseController<FileTagEntity, FileTagDto> {
    constructor(private readonly fileTagService: FileTagService) {
        super(fileTagService);
    }

    @Post({
        path: 'assign-tags-to-file',
        summary: 'Assign tags to file (by ids)',
        responseDto: Boolean,
    })
    async assignTagsToFile(@Body() request: AssignTagsToFileByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.assignTagsToFile(request);
        return result;
    }

    @Post({
        path: 'remove-tags-from-file',
        summary: 'Remove tags from file (by ids)',
        responseDto: Boolean,
    })
    async removeTagsFromFile(@Body() request: RemoveTagsFromFileByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.removeTagsFromFile(request);
        return result;
    }

    @Post({
        path: 'assign-files-to-tag',
        summary: 'Assign files to tag (by ids)',
        responseDto: Boolean,
    })
    async assignFilesToTag(@Body() request: AssignFilesToTagByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.assignFilesToTag(request);
        return result;
    }

    @Post({
        path: 'remove-files-from-tag',
        summary: 'Remove files from tag (by ids)',
        responseDto: Boolean,
    })
    async removeFilesFromTag(@Body() request: RemoveFilesFromTagByIdsRequestDto): Promise<boolean> {
        const result = await this.fileTagService.removeFilesFromTag(request);
        return result;
    }
}
