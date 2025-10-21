export class ValidateParserFunctionResponseDto {
    status: 'success' | 'error';
    data?: Record<string, any>;
    error?: string;

    constructor(data?: Partial<ValidateParserFunctionResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
