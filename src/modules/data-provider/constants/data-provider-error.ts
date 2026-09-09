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

    static readonly MissingTestInput: IAppError = {
        code: 'data_provider_missing_test_input',
        message: 'Yêu cầu URL, nội dung dữ liệu hoặc nội dung HTML để kiểm tra.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly MissingSearchTestInput: IAppError = {
        code: 'data_provider_missing_search_test_input',
        message: 'Yêu cầu từ khóa tìm kiếm, mẫu URL tìm kiếm, URL hoặc nội dung HTML để kiểm tra.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly NoSampleItemFound: IAppError = {
        code: 'data_provider_no_sample_item_found',
        message: 'Không tìm thấy sản phẩm mẫu nào để kiểm tra tính năng.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static ScraperServiceNotFound = (service: string): IAppError => ({
        code: 'data_provider_scraper_service_not_found',
        message: `Không tìm thấy scraper service '${service}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { service },
    });

    static SearchServiceNotFound = (service: string): IAppError => ({
        code: 'data_provider_search_service_not_found',
        message: `Không tìm thấy search service '${service}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { service },
    });

    static FeatureTestFailed = (error: string): IAppError => ({
        code: 'data_provider_feature_test_failed',
        message: `Kiểm tra cấu hình tính năng thất bại: ${error}`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { error },
    });

    static FeatureValidationFailed = (error: string): IAppError => ({
        code: 'data_provider_feature_validation_failed',
        message: `Xác thực tính năng thất bại: ${error}`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { error },
    });

    static ConfigVersionNotFound = (versionId: number | string, featureId?: string): IAppError => ({
        code: 'data_provider_config_version_not_found',
        message: featureId
            ? `Không tìm thấy phiên bản cấu hình ${versionId} cho tính năng ${featureId}.`
            : `Không tìm thấy phiên bản cấu hình ${versionId}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { versionId: String(versionId), featureId },
    });

    static readonly CannotDeleteActiveConfigVersion: IAppError = {
        code: 'data_provider_cannot_delete_active_config_version',
        message: 'Không thể xóa phiên bản cấu hình đang hoạt động.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static DataProviderItemNotFound = (id: string): IAppError => ({
        code: 'data_provider_item_not_found',
        message: `Không tìm thấy liên kết sản phẩm của nhà cung cấp với ID ${id}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { id },
    });

    static DataProviderItemNotFoundByProviderId = (dataProviderId: string): IAppError => ({
        code: 'data_provider_item_not_found_by_provider',
        message: `Không tìm thấy sản phẩm nào thuộc nhà cung cấp với ID ${dataProviderId}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { dataProviderId },
    });

    static readonly DataProviderItemAlreadyExists: IAppError = {
        code: 'data_provider_item_already_exists',
        message: 'Sản phẩm của nhà cung cấp dữ liệu đã tồn tại.',
        statusCode: HttpStatus.CONFLICT,
    };

    static InvalidItemUrl = (expectedBaseUrl: string, gotUrl: string): IAppError => ({
        code: 'data_provider_invalid_item_url',
        message: `Đường dẫn sản phẩm phải bắt đầu bằng URL gốc '${expectedBaseUrl}'. Nhận được: '${gotUrl}'.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { expectedBaseUrl, gotUrl },
    });

    static NoDiscoveredUrlsFound = (sessionId: string): IAppError => ({
        code: 'discovery_no_urls_for_validation',
        message: `Không tìm thấy URL nào trong phiên discovery ID ${sessionId} để xác thực.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { sessionId },
    });

    static ValidationBatchNotFound = (batchId: string): IAppError => ({
        code: 'discovery_validation_batch_not_found',
        message: `Không tìm thấy đợt xác thực với ID ${batchId}.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { batchId },
    });

    static readonly BatchAlreadyFinishedOrCancelled: IAppError = {
        code: 'discovery_validation_batch_already_finished',
        message: 'Đợt xác thực đã hoàn thành hoặc đã bị hủy trước đó.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly FailedToQueueValidationJobs: IAppError = {
        code: 'discovery_validation_queue_failed',
        message: 'Không thể thêm tác vụ xác thực vào hàng đợi xử lý.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
}
