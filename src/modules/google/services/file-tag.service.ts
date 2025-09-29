import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { FileTagDto } from '../dtos/file-tag.dto';
import { FileTagEntity } from '../entities/file-tag.entity';
import { GoogleDriveFileTagEntity } from '../entities/google-drive-file-tag.entity';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import {
    AssignFilesToTagByIdsRequestDto,
    AssignTagsToFileByIdsRequestDto,
    RemoveFilesFromTagByIdsRequestDto,
    RemoveTagsFromFileByIdsRequestDto,
} from '../dtos/requests';

@Injectable()
export class FileTagService extends BaseService<FileTagEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(FileTagEntity)
        private readonly fileTagRepository: Repository<FileTagEntity>,

        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,

        @InjectRepository(GoogleDriveFileTagEntity)
        private readonly googleDriveFileTagRepository: Repository<GoogleDriveFileTagEntity>,
    ) {
        super(fileTagRepository);
    }

    async createTag(name: string): Promise<FileTagDto> {
        const saved = await this.create({ name: name.trim() });
        return this.mapper.map(saved, FileTagEntity, FileTagDto);
    }

    async getTags(): Promise<FileTagDto[]> {
        const tags = await this.findAll();
        return this.mapper.mapArray(tags, FileTagEntity, FileTagDto);
    }

    async updateTag(tagId: string, name: string): Promise<boolean> {
        const existing = await this.exists({ id: tagId });
        if (!existing) {
            this.loggerService.error(`Tag not found: ${tagId}`);
            throw new NotFoundException('Tag not found');
        }

        const updated = await this.update(tagId, { name: name.trim() });
        return updated;
    }

    async deleteTag(tagId: string): Promise<boolean> {
        const existing = await this.exists({ id: tagId });
        if (!existing) {
            this.loggerService.error(`Tag not found: ${tagId}`);
            throw new NotFoundException('Tag not found');
        }

        const deleted = await this.delete(tagId);
        return deleted;
    }

    async assignTagsToFile(request: AssignTagsToFileByIdsRequestDto): Promise<boolean> {
        const { fileId, fileTagIds } = request;

        const googleDriveFileExists = await this.googleDriveFileRepository.exists({ where: { id: fileId } });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileId}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.fileTagRepository.exists({ where: { id: In(fileTagIds) } });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileTagIds?.join(', ')}`);
            throw new NotFoundException('File tags not found');
        }

        const existing = await this.googleDriveFileTagRepository.find({
            where: { googleDriveFileId: fileId, fileTagId: In(fileTagIds) },
            select: ['fileTagId'],
        });
        const existingSet = new Set(existing.map((e) => e.fileTagId));

        const googleDriveFileTags = fileTagIds
            .filter((fileTagId) => !existingSet.has(fileTagId))
            .map((fileTagId) => this.googleDriveFileTagRepository.create({ googleDriveFileId: fileId, fileTagId }));

        if (!googleDriveFileTags.length) {
            this.loggerService.warn(`No new file tags to assign: ${fileTagIds?.join(', ')}`);
            return true;
        }

        const saved = await this.googleDriveFileTagRepository.save(googleDriveFileTags);
        return !!saved;
    }

    async removeTagsFromFile(request: RemoveTagsFromFileByIdsRequestDto): Promise<boolean> {
        const { fileId, fileTagIds } = request;

        const googleDriveFileExists = await this.googleDriveFileRepository.exists({ where: { id: fileId } });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileId}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.fileTagRepository.exists({ where: { id: In(fileTagIds) } });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileTagIds?.join(', ')}`);
            throw new NotFoundException('File tags not found');
        }

        const removed = await this.googleDriveFileTagRepository.delete({ googleDriveFileId: fileId, fileTagId: In(fileTagIds) });
        return !!removed;
    }

    async assignFilesToTag(request: AssignFilesToTagByIdsRequestDto): Promise<boolean> {
        const { fileTagId, fileIds } = request;

        const googleDriveFileExists = await this.googleDriveFileRepository.exists({ where: { id: In(fileIds) } });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileIds}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.fileTagRepository.exists({ where: { id: fileTagId } });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileIds}`);
            throw new NotFoundException('File tags not found');
        }

        const existing = await this.googleDriveFileTagRepository.find({
            where: { googleDriveFileId: In(fileIds), fileTagId: fileTagId },
            select: ['googleDriveFileId'],
        });
        const existingSet = new Set(existing.map((e) => e.googleDriveFileId));

        const googleDriveFileTags = fileIds
            .filter((fileId) => !existingSet.has(fileId))
            .map((fileId) => this.googleDriveFileTagRepository.create({ googleDriveFileId: fileId, fileTagId: fileTagId }));

        if (!googleDriveFileTags.length) {
            this.loggerService.warn(`No new files to assign: ${fileIds?.join(', ')}`);
            return true;
        }

        const saved = await this.googleDriveFileTagRepository.save(googleDriveFileTags);
        return !!saved;
    }

    async removeFilesFromTag(request: RemoveFilesFromTagByIdsRequestDto): Promise<boolean> {
        const { fileTagId, fileIds } = request;

        const googleDriveFileExists = await this.googleDriveFileRepository.exists({ where: { id: In(fileIds) } });
        if (!googleDriveFileExists) {
            this.loggerService.error(`File not found: ${fileIds?.join(', ')}`);
            throw new NotFoundException('File not found');
        }

        const fileTagsExists = await this.fileTagRepository.exists({ where: { id: fileTagId } });
        if (!fileTagsExists) {
            this.loggerService.error(`File tags not found: ${fileIds}`);
            throw new NotFoundException('File tags not found');
        }

        const removed = await this.googleDriveFileTagRepository.delete({ googleDriveFileId: In(fileIds), fileTagId: fileTagId });
        return !!removed;
    }
}
