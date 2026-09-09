import { BadRequestException, Body, Controller, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

import { Auth, Post } from '../../../decorators';
import { ImportDataRequestDto } from '../dtos/requests';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from '../dtos/responses';
import { ExcelFileTypes, ImportDataType } from '../enums';
import { ImportDataService } from '../services/import-data.service';

@Controller('import-data')
@ApiTags('Import Data')
@Auth()
export class ImportDataController {
    constructor(private readonly importDataService: ImportDataService) {}

    @Post({
        path: 'preview-import-data/:dataType',
        summary: 'Preview import data from file',
        description: 'Preview import data based on data type from file upload',
        responseDto: PreviewImportDataResponseDto,
    })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_, __, cb) => {
                    const uploadDir = path.resolve(process.cwd(), 'uploads');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    cb(null, uploadDir);
                },
                filename: (_, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `import-data-${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                fileSize: 1024 * 1024 * 20,
            },
            fileFilter: (_, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (![ExcelFileTypes.XLSX, ExcelFileTypes.XLS, ExcelFileTypes.CSV].includes(ext as ExcelFileTypes)) {
                    return cb(new BadRequestException('Only Excel files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    async previewImportData(
        @UploadedFile() file: Express.Multer.File,
        @Param('dataType') dataType: ImportDataType,
    ): Promise<PreviewImportDataResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        try {
            const result = await this.importDataService.previewImportData(file.path, dataType);

            fs.unlinkSync(file.path);

            return result;
        } catch (error) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            throw new BadRequestException(`Failed to preview import data: ${error.message}`);
        }
    }

    @Post({
        path: 'import-data',
        summary: 'Import data from request',
        description: 'Import data based on data type from request',
        responseDto: ImportDataResponseDto,
    })
    async importData(@Body() request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        const result = await this.importDataService.importData(request);
        return result;
    }
}
