import { Response } from 'express';
import * as fs from 'fs';

import { LoggerService } from '../services/logger.service';

export class FileHelper {
    private readonly loggerService: LoggerService = new LoggerService(FileHelper.name);

    async cleanupFile(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (error) {
            this.loggerService.error(`Error deleting file: ${error.message}`);
        }
    }

    async sendFileAsDownload(res: Response, filePath: string, fileName: string): Promise<void> {
        res.download(filePath, fileName, (err) => {
            if (err) {
                this.loggerService.error(`Error downloading file: ${err.message}`);
            }

            this.cleanupFile(filePath);
        });
    }
}
