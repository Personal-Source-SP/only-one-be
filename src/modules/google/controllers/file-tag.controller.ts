import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { FileTagDto } from '../dtos/file-tag.dto';
import {
    AssignFilesToTagByIdsRequestDto,
    AssignTagsToFileByIdsRequestDto,
    CreateFileTagRequestDto,
    RemoveFilesFromTagByIdsRequestDto,
    RemoveTagsFromFileByIdsRequestDto,
    UpdateFileTagRequestDto,
} from '../dtos/requests';
import { FileTagService } from '../services/file-tag.service';

@Controller('file-tag')
@ApiTags('file-tag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileTagController extends BaseController {
    constructor(private readonly fileTagService: FileTagService) {
        super();
    }

    @ApiOperation({ summary: 'Create tag' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @ApiOkResponse({ type: FileTagDto })
    public async createTag(@Body() request: CreateFileTagRequestDto): Promise<FileTagDto> {
        const result = await this.fileTagService.createTag(request.name);
        return result;
    }

    @ApiOperation({ summary: 'Get tags' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkResponse({ type: [FileTagDto] })
    public async getTags(): Promise<FileTagDto[]> {
        const result = await this.fileTagService.getTags();
        return result;
    }

    @ApiOperation({ summary: 'Update tag' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':tagId')
    @ApiOkResponse({ type: Boolean })
    public async updateTag(@Param('tagId', new ParseUUIDPipe()) tagId: string, @Body() request: UpdateFileTagRequestDto): Promise<boolean> {
        const result = await this.fileTagService.updateTag(tagId, request.name);
        return result;
    }

    @ApiOperation({ summary: 'Delete tag' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':tagId')
    @ApiOkResponse({ type: Boolean })
    public async deleteTag(@Param('tagId', new ParseUUIDPipe()) tagId: string): Promise<boolean> {
        const result = await this.fileTagService.deleteTag(tagId);
        return result;
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
