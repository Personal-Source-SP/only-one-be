import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { FileTagDto } from '../dtos/file-tag.dto';
import {
    AssignFilesToTagByIdsRequestDto,
    AssignTagsToFileByIdsRequestDto,
    RemoveFilesFromTagByIdsRequestDto,
    RemoveTagsFromFileByIdsRequestDto,
} from '../dtos/requests';
import { FileTagEntity } from '../entities/file-tag.entity';
import { GoogleDriveFileTagService } from './google-drive-file-tag.service';
import { GoogleFileService } from './google-file.service';

@Injectable()
export class FileTagService extends BaseService<FileTagEntity, FileTagDto> {
    constructor(
        private readonly googleFileService: GoogleFileService,
        private readonly googleDriveFileTagService: GoogleDriveFileTagService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(FileTagEntity) fileTagRepository: Repository<FileTagEntity>,
    ) {
        super(fileTagRepository, mapper, FileTagDto, FileTagService.name);
    }

    async assignTagsToFile(request: AssignTagsToFileByIdsRequestDto): Promise<boolean> {
        const { fileId, fileTagIds } = request;

        const googleDriveFileExists = await this.googleFileService.exists({ id: fileId });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileId}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.exists({ id: In(fileTagIds) });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileTagIds?.join(', ')}`);
            throw new NotFoundException('File tags not found');
        }

        const existing = await this.googleDriveFileTagService.findListByFilter(
            {
                googleDriveFileId: fileId,
                fileTagId: In(fileTagIds),
            },
            { select: { fileTag: true } },
        );
        const existingSet = new Set(existing.map((e) => e.id));

        const googleDriveFileTags = fileTagIds
            .filter((fileTagId) => !existingSet.has(fileTagId))
            .map((fileTagId) => this.googleDriveFileTagService.repository.create({ googleDriveFileId: fileId, fileTagId }));

        if (!googleDriveFileTags.length) {
            this.loggerService.warn(`No new file tags to assign: ${fileTagIds?.join(', ')}`);
            return true;
        }

        const saved = await this.googleDriveFileTagService.createMany(googleDriveFileTags);
        return !!saved;
    }

    async removeTagsFromFile(request: RemoveTagsFromFileByIdsRequestDto): Promise<boolean> {
        const { fileId, fileTagIds } = request;

        const googleDriveFileExists = await this.googleFileService.exists({ id: fileId });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileId}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.exists({ id: In(fileTagIds) });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileTagIds?.join(', ')}`);
            throw new NotFoundException('File tags not found');
        }

        const removed = await this.googleDriveFileTagService.deleteMany({ googleDriveFileId: fileId, fileTagId: In(fileTagIds) });
        return !!removed;
    }

    async assignFilesToTag(request: AssignFilesToTagByIdsRequestDto): Promise<boolean> {
        const { fileTagId, fileIds } = request;

        const googleDriveFileExists = await this.googleFileService.exists({ id: In(fileIds) });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileIds}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.exists({ id: fileTagId });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileIds}`);
            throw new NotFoundException('File tags not found');
        }

        const existing = await this.googleDriveFileTagService.findListByFilter(
            {
                googleDriveFileId: In(fileIds),
                fileTagId: fileTagId,
            },
            { select: { googleDriveFileId: true } },
        );
        const existingSet = new Set(existing.map((e) => e.id));

        const googleDriveFileTags = fileIds
            .filter((fileId) => !existingSet.has(fileId))
            .map((fileId) => this.googleDriveFileTagService.repository.create({ googleDriveFileId: fileId, fileTagId: fileTagId }));

        if (!googleDriveFileTags.length) {
            this.loggerService.warn(`No new files to assign: ${fileIds?.join(', ')}`);
            return true;
        }

        const saved = await this.googleDriveFileTagService.createMany(googleDriveFileTags);
        return !!saved;
    }

    async removeFilesFromTag(request: RemoveFilesFromTagByIdsRequestDto): Promise<boolean> {
        const { fileTagId, fileIds } = request;

        const googleDriveFileExists = await this.googleFileService.exists({ id: In(fileIds) });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileIds?.join(', ')}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.exists({ id: fileTagId });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileIds}`);
            throw new NotFoundException('File tags not found');
        }

        const removed = await this.googleDriveFileTagService.deleteMany({ googleDriveFileId: In(fileIds), fileTagId: fileTagId });
        return removed;
    }
}
