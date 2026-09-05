import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class SimulationError {
    static readonly ItemNotFound: IAppError = {
        code: 'simulation_item_not_found',
        message: 'Không tìm thấy simulation item.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly ServiceExecutionRequired: IAppError = {
        code: 'simulation_service_execution_required',
        message: 'Service execution là bắt buộc.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static ServiceExecutionNotSupported = (service: string): IAppError => ({
        code: 'simulation_service_execution_not_supported',
        message: `Service execution '${service}' không được hỗ trợ.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { service },
    });

    static UnsupportedActionType = (actionType: string): IAppError => ({
        code: 'simulation_unsupported_action_type',
        message: `Action type '${actionType}' không được hỗ trợ.`,
        statusCode: HttpStatus.BAD_REQUEST,
        params: { actionType },
    });

    static readonly GetCurrentPageFailed: IAppError = {
        code: 'simulation_get_current_page_failed',
        message: 'Không thể lấy trang hiện tại từ browser context.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static readonly CloseBrowserFailed: IAppError = {
        code: 'simulation_close_browser_failed',
        message: 'Không thể đóng browser context.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    static ElementTimeout = (selector: string, timeoutInMs: number): IAppError => ({
        code: 'simulation_browser_element_timeout',
        message: `Phần tử '${selector}' không xuất hiện sau ${timeoutInMs}ms.`,
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        params: { selector, timeoutInMs },
    });

    static InputNotFound = (selector: string): IAppError => ({
        code: 'simulation_browser_input_not_found',
        message: `Không tìm thấy ô nhập liệu '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { selector },
    });

    static readonly OptionParamRequired: IAppError = {
        code: 'simulation_browser_option_param_required',
        message: 'Bắt buộc phải truyền optionValue hoặc optionLabel.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static OptionValueNotFound = (value: string, selector: string): IAppError => ({
        code: 'simulation_browser_option_value_not_found',
        message: `Giá trị option '${value}' không tồn tại cho selector '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { value, selector },
    });

    static OptionLabelNotFound = (label: string, selector: string): IAppError => ({
        code: 'simulation_browser_option_label_not_found',
        message: `Nhãn option '${label}' không tồn tại cho selector '${selector}'.`,
        statusCode: HttpStatus.NOT_FOUND,
        params: { label, selector },
    });
}
