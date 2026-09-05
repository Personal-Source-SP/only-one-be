import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class DataProviderError {
    static readonly DataProviderNotFound: IAppError = {
        code: 'data_provider_not_found',
        message: 'Không tìm thấy nhà cung cấp dữ liệu.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static DataProviderWithIdNotFound = (id: string): IAppError => ({
        code: 'data_provider_not_found',
        message: `Không tìm thấy nhà cung cấp dữ liệu với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static readonly DuplicateDataProvider: IAppError = {
        code: 'data_provider_already_exists',
        message: 'Nhà cung cấp dữ liệu đã tồn tại.',
        statusCode: HttpStatus.CONFLICT,
    };

    static BaseUrlAlreadyExists = (baseUrl: string): IAppError => ({
        code: 'data_provider_base_url_already_exists',
        message: `Nhà cung cấp dữ liệu với baseUrl '${baseUrl}' đã tồn tại.`,
        statusCode: HttpStatus.CONFLICT,
        params: { baseUrl },
    });

    static IdentifierAlreadyExists = (identifier: string): IAppError => ({
        code: 'data_provider_identifier_already_exists',
        message: `Nhà cung cấp dữ liệu với identifier '${identifier}' đã tồn tại.`,
        statusCode: HttpStatus.CONFLICT,
        params: { identifier },
    });

    static readonly InvalidIdentifierFormat: IAppError = {
        code: 'data_provider_invalid_identifier_format',
        message: 'Identifier chỉ được chứa chữ cái thường, số và dấu gạch ngang (-).',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static FeatureNotFound = (id: string): IAppError => ({
        code: 'data_provider_feature_not_found',
        message: `Không tìm thấy tính năng với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static FeatureAlreadyExists = (type: string, dataProviderId: string): IAppError => ({
        code: 'data_provider_feature_already_exists',
        message: `Tính năng '${type}' đã tồn tại cho nhà cung cấp dữ liệu.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { type, dataProviderId },
    });

    static FeatureTypeNotFound = (type: string, dataProviderId: string): IAppError => ({
        code: 'data_provider_feature_type_not_found',
        message: `Không tìm thấy tính năng '${type}' cho nhà cung cấp dữ liệu.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { type, dataProviderId },
    });

    static readonly InvalidStatusSwitchUnconfigured: IAppError = {
        code: 'data_provider_invalid_switch_unconfigured',
        message: 'Không được phép chuyển trạng thái về UNCONFIGURED.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidStatusSwitchReady: IAppError = {
        code: 'data_provider_invalid_switch_ready',
        message: 'Chỉ được phép chuyển sang trạng thái READY khi đang ở trạng thái TESTING hoặc ERROR.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly InvalidStatusSwitchTesting: IAppError = {
        code: 'data_provider_invalid_switch_testing',
        message: 'Không được phép chuyển sang trạng thái TESTING từ trạng thái hiện tại.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static RunnerNotFound = (type: string): IAppError => ({
        code: 'data_provider_runner_not_found',
        message: `Không tìm thấy runner cho tính năng '${type}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { type },
    });

    static SessionNotFound = (id: string): IAppError => ({
        code: 'discovery_session_not_found',
        message: `Không tìm thấy phiên discovery với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static UrlNotFound = (id: string): IAppError => ({
        code: 'discovery_url_not_found',
        message: `Không tìm thấy URL discovery với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static ItemNotFound = (id: string): IAppError => ({
        code: 'data_provider_item_not_found',
        message: `Không tìm thấy item dữ liệu với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static ItemWithCodeAlreadyExists = (code: string): IAppError => ({
        code: 'data_provider_item_code_already_exists',
        message: `Sản phẩm với mã '${code}' đã tồn tại.`,
        statusCode: HttpStatus.CONFLICT,
        params: { code },
    });

    static readonly ExtractDataFailed: IAppError = {
        code: 'data_provider_extract_data_failed',
        message: 'Trích xuất dữ liệu không thành công.',
        statusCode: HttpStatus.BAD_REQUEST,
    };
}
