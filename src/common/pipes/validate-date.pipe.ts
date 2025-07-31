import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isDateString } from 'class-validator';

@Injectable()
export class ValidateDatePipe implements PipeTransform<string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        if (!isDateString(value)) {
            throw new BadRequestException('Invalid date format. Date must be a valid ISO string.');
        }
        return value;
    }
}
