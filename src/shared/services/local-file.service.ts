import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { LoggerService } from './logger.service';

export interface ICreateFileOptions {
    encoding?: BufferEncoding;
    mode?: number;
    flag?: string;
    createDirIfNotExists?: boolean;
}

export interface IReadFileOptions {
    encoding?: BufferEncoding;
    flag?: string;
}

export interface IFileStats {
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
}

@Injectable()
export class LocalFileService {
    private readonly loggerService: LoggerService = new LoggerService(LocalFileService.name);

    async createFile(filePath: string, content: string | Buffer, options?: ICreateFileOptions): Promise<void> {
        const resolvedPath = this.resolvePath(filePath);
        const { encoding = 'utf-8', createDirIfNotExists = true, ...writeOptions } = options || {};

        try {
            if (createDirIfNotExists) {
                await this.ensureDirectoryExists(path.dirname(resolvedPath));
            }

            const writeContent = Buffer.isBuffer(content) ? content : Buffer.from(content, encoding);
            await fs.promises.writeFile(resolvedPath, writeContent, writeOptions);
            this.loggerService.info(`File created: ${resolvedPath}`);
        } catch (error) {
            this.loggerService.error(`Error creating file ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async readFile(filePath: string, options?: IReadFileOptions): Promise<string | Buffer> {
        const resolvedPath = this.resolvePath(filePath);
        const { encoding = 'utf-8', ...readOptions } = options || {};

        try {
            if (encoding) {
                return await fs.promises.readFile(resolvedPath, { encoding, ...readOptions });
            }
            return await fs.promises.readFile(resolvedPath, readOptions);
        } catch (error) {
            this.loggerService.error(`Error reading file ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async readFileAsJson<T = any>(filePath: string): Promise<T> {
        const content = await this.readFile(filePath, { encoding: 'utf-8' });
        try {
            return JSON.parse(content as string);
        } catch (error) {
            this.loggerService.error(`Error parsing JSON file ${filePath}: ${error?.message}`);
            throw new Error(`Invalid JSON file: ${error?.message}`);
        }
    }

    async updateFile(filePath: string, content: string | Buffer, options?: ICreateFileOptions): Promise<void> {
        const resolvedPath = this.resolvePath(filePath);

        if (!(await this.fileExists(resolvedPath))) {
            throw new Error(`File not found: ${resolvedPath}`);
        }

        await this.createFile(resolvedPath, content, options);
        this.loggerService.info(`File updated: ${resolvedPath}`);
    }

    async appendFile(filePath: string, content: string | Buffer, options?: ICreateFileOptions): Promise<void> {
        const resolvedPath = this.resolvePath(filePath);
        const { encoding = 'utf-8', createDirIfNotExists = true, ...writeOptions } = options || {};

        try {
            if (createDirIfNotExists) {
                await this.ensureDirectoryExists(path.dirname(resolvedPath));
            }

            const appendContent = Buffer.isBuffer(content) ? content : Buffer.from(content, encoding);
            await fs.promises.appendFile(resolvedPath, appendContent, writeOptions);
            this.loggerService.info(`Content appended to file: ${resolvedPath}`);
        } catch (error) {
            this.loggerService.error(`Error appending to file ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        const resolvedPath = this.resolvePath(filePath);

        try {
            if (!(await this.fileExists(resolvedPath))) {
                this.loggerService.warn(`File not found for deletion: ${resolvedPath}`);
                return;
            }

            await fs.promises.unlink(resolvedPath);
            this.loggerService.info(`File deleted: ${resolvedPath}`);
        } catch (error) {
            this.loggerService.error(`Error deleting file ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async fileExists(filePath: string): Promise<boolean> {
        const resolvedPath = this.resolvePath(filePath);
        try {
            await fs.promises.access(resolvedPath);
            return true;
        } catch {
            return false;
        }
    }

    async isFile(filePath: string): Promise<boolean> {
        const resolvedPath = this.resolvePath(filePath);
        try {
            const stats = await fs.promises.stat(resolvedPath);
            return stats.isFile();
        } catch {
            return false;
        }
    }

    async isDirectory(dirPath: string): Promise<boolean> {
        const resolvedPath = this.resolvePath(dirPath);
        try {
            const stats = await fs.promises.stat(resolvedPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    async createDirectory(dirPath: string, recursive = true): Promise<void> {
        const resolvedPath = this.resolvePath(dirPath);

        try {
            await fs.promises.mkdir(resolvedPath, { recursive });
            this.loggerService.info(`Directory created: ${resolvedPath}`);
        } catch (error) {
            this.loggerService.error(`Error creating directory ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async deleteDirectory(dirPath: string, recursive = false): Promise<void> {
        const resolvedPath = this.resolvePath(dirPath);

        try {
            if (!(await this.directoryExists(resolvedPath))) {
                this.loggerService.warn(`Directory not found for deletion: ${resolvedPath}`);
                return;
            }

            await fs.promises.rmdir(resolvedPath, { recursive });
            this.loggerService.info(`Directory deleted: ${resolvedPath}`);
        } catch (error) {
            this.loggerService.error(`Error deleting directory ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async directoryExists(dirPath: string): Promise<boolean> {
        return this.isDirectory(dirPath);
    }

    async getFileStats(filePath: string): Promise<IFileStats> {
        const resolvedPath = this.resolvePath(filePath);
        try {
            const stats = await fs.promises.stat(resolvedPath);
            return {
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                accessedAt: stats.atime,
            };
        } catch (error) {
            this.loggerService.error(`Error getting file stats ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async listDirectory(dirPath: string): Promise<string[]> {
        const resolvedPath = this.resolvePath(dirPath);
        try {
            return await fs.promises.readdir(resolvedPath);
        } catch (error) {
            this.loggerService.error(`Error listing directory ${resolvedPath}: ${error?.message}`);
            throw error;
        }
    }

    async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        const resolvedSource = this.resolvePath(sourcePath);
        const resolvedDestination = this.resolvePath(destinationPath);

        try {
            await this.ensureDirectoryExists(path.dirname(resolvedDestination));
            await fs.promises.copyFile(resolvedSource, resolvedDestination);
            this.loggerService.info(`File copied from ${resolvedSource} to ${resolvedDestination}`);
        } catch (error) {
            this.loggerService.error(`Error copying file: ${error?.message}`);
            throw error;
        }
    }

    async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
        const resolvedSource = this.resolvePath(sourcePath);
        const resolvedDestination = this.resolvePath(destinationPath);

        try {
            await this.ensureDirectoryExists(path.dirname(resolvedDestination));
            await fs.promises.rename(resolvedSource, resolvedDestination);
            this.loggerService.info(`File moved from ${resolvedSource} to ${resolvedDestination}`);
        } catch (error) {
            this.loggerService.error(`Error moving file: ${error?.message}`);
            throw error;
        }
    }

    getMimeTypeFromExtension(ext: string): string {
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/x-m4v',
            '.3gp': 'video/3gpp',
            '.mpg': 'video/mpeg',
            '.mpeg': 'video/mpeg',
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.zip': 'application/zip',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    private resolvePath(filePath: string): string {
        return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        const resolvedPath = this.resolvePath(dirPath);
        if (!(await this.directoryExists(resolvedPath))) {
            await this.createDirectory(resolvedPath, true);
        }
    }
}
