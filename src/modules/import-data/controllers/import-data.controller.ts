import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

import { FileInterceptor } from '@nestjs/platform-express';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { ImportDataRequestDto } from '../dtos/requests';
import { ImportDataResponseDto, PreviewImportDataResponseDto } from '../dtos/responses';
import { ExcelFileTypes, ImportDataType } from '../enums';
import { ImportDataService } from '../import-data.service';

@Controller('import-data')
@ApiTags('import-data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportDataController {
    constructor(private readonly importDataService: ImportDataService) {}

    @ApiOperation({
        summary: 'Preview import data from file',
        description: 'Preview import data based on data type from file upload',
    })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('preview-import-data/:dataType')
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
    @BaseApiOkResponse(PreviewImportDataResponseDto)
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

    @ApiOperation({
        summary: 'Import data from request',
        description: 'Import data based on data type from request',
    })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('import-data')
    @BaseApiOkResponse(ImportDataResponseDto)
    public async importData(@Body() request: ImportDataRequestDto): Promise<ImportDataResponseDto> {
        const result = await this.importDataService.importData(request);
        return result;
    }
}
