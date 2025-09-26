import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleDriveFileResponseDto } from '../dtos/responses/google-drive-file.response.dto';
import { PaginatedFilesResponseDto } from '../dtos/responses/paginated-files.response.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';

@Injectable()
export class GoogleDriveService {
    constructor(
        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,
    ) {}

    async getUserFiles(
        userId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            mimeType?: string;
            starredOnly?: boolean;
            trashedOnly?: boolean;
        },
    ): Promise<PaginatedFilesResponseDto> {
        const whereConditions: any = { userId };

        if (filters?.mimeType) {
            whereConditions.mimeType = filters.mimeType;
        }

        if (filters?.starredOnly) {
            whereConditions.isStarred = true;
        }

        if (filters?.trashedOnly) {
            whereConditions.isTrashed = true;
        }

        const [files, total] = await this.googleDriveFileRepository.findAndCount({
            where: whereConditions,
            skip: (page - 1) * limit,
            take: limit,
            order: { lastModified: 'DESC' },
        });

        const responseFiles = files.map((file) => ({
            id: file.id,
            googleDriveId: file.googleDriveId,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            parentFolderId: file.parentFolderId,
            lastModified: file.lastModified,
            lastViewedByMe: file.lastViewedByMe,
            isTrashed: file.isTrashed,
            isStarred: file.isStarred,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        }));

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            files: responseFiles,
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev,
        };
    }

    async getFileById(userId: string, fileId: string): Promise<GoogleDriveFileResponseDto> {
        const file = await this.googleDriveFileRepository.findOne({
            where: { id: fileId, userId },
        });

        if (!file) {
            throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        return {
            id: file.id,
            googleDriveId: file.googleDriveId,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            parentFolderId: file.parentFolderId,
            lastModified: file.lastModified,
            lastViewedByMe: file.lastViewedByMe,
            isTrashed: file.isTrashed,
            isStarred: file.isStarred,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    }
}
