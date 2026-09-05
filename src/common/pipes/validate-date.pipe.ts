import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { isDateString } from 'class-validator';

import { AppError } from '../../constant/error-code';
import { AppException } from '../../exceptions/app.exception';

@Injectable()
export class ValidateDatePipe implements PipeTransform<string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        if (!isDateString(value)) {
            throw new AppException(AppError.InvalidFieldFormat(metadata.data || 'date', 'Date must be a valid ISO string.'));
        }
        return value;
    }
}
