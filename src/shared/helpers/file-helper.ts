import { Logger } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';

export class FileHelper {
    private readonly logger = new Logger(FileHelper.name);

    async cleanupFile(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (error) {
            this.logger.error(`Error deleting file: ${error.message}`);
        }
    }

    async sendFileAsDownload(res: Response, filePath: string, fileName: string): Promise<void> {
        res.download(filePath, fileName, (err) => {
            if (err) {
                this.logger.error(`Error downloading file: ${err.message}`);
            }

            this.cleanupFile(filePath);
        });
    }
}
