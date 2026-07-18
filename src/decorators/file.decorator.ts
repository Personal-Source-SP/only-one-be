import { applyDecorators, BadRequestException, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import * as fs from 'fs';
import { diskStorage, memoryStorage } from 'multer';
import path from 'path';

import { FileTypes } from '../common/enums';

type ApiFileOptions = {
    name?: string;
    required?: boolean;
    description?: string;
    maxSize?: number;
    isDiskStorage?: boolean;
    allowedTypes?: FileTypes[];
};

export const ApiFile = (options?: ApiFileOptions) => {
    const name = options?.name || 'file';
    const isRequired = options?.required ?? true;
    const maxSize = options?.maxSize ?? 1024 * 1024 * 20;
    const isDiskStorage = options?.isDiskStorage ?? false;
    const description = options?.description || 'File to upload';

    const properties = {
        [name]: {
            description,
            type: 'string',
            format: 'binary',
        },
    };

    const required = isRequired ? [name] : undefined;
    const allowedTypes = options?.allowedTypes || Object.values(FileTypes);

    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties,
                ...(required && { required }),
            },
        }),
        UseInterceptors(
            FileInterceptor(name, {
                storage: isDiskStorage
                    ? diskStorage({
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
                              cb(null, `file-${uniqueSuffix}${ext}`);
                          },
                      })
                    : memoryStorage(),
                limits: {
                    fileSize: maxSize,
                },
                fileFilter: (_, file, cb) => {
                    const ext = path.extname(file.originalname).toLowerCase();
                    if (!allowedTypes.includes(ext as FileTypes)) {
                        return cb(new BadRequestException(`Only ${allowedTypes.join(', ')} files are allowed`), false);
                    }

                    cb(null, true);
                },
            }),
        ),
    );
};
