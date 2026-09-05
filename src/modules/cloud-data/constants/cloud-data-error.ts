import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class CloudDataError {
    static ItemWithIdNotFound = (id: string): IAppError => ({
        code: 'cloud_data_item_not_found',
        message: `Không tìm thấy bản ghi cloud data item với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static ProviderWithIdNotFound = (id: string): IAppError => ({
        code: 'cloud_data_provider_not_found',
        message: `Không tìm thấy nhà cung cấp cloud data với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static ServiceTypeNotFound = (type: string): IAppError => ({
        code: 'cloud_data_service_not_found',
        message: `Không tìm thấy dịch vụ cloud data cho loại ${type}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { type },
    });

    static UploadFailed = (reason?: string): IAppError => ({
        code: 'cloud_data_upload_failed',
        message: reason || 'Tải file lên cloud data thất bại.',
        statusCode: HttpStatus.BAD_REQUEST,
        params: { reason },
    });

    static readonly SaveItemFailed: IAppError = {
        code: 'cloud_data_save_item_failed',
        message: 'Lưu bản ghi cloud data item thất bại.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly TelegramSessionInvalid: IAppError = {
        code: 'cloud_data_telegram_session_invalid',
        message: 'Phiên kết nối Telegram không hợp lệ hoặc đã hết hạn.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
