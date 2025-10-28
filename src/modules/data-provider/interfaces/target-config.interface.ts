export interface ITargetConfig {
    functionGenerator: string; //  Hàm xử lý dữ liệu

    mainContentSelector?: string; // Selector lấy nội dung chính
    isGetParentElement?: boolean; // Lấy phần tử cha của nội dung chính

    queryParams?: string; //  Tham số truyền vào API

    maxResults?: number; // Số lượng kết quả tối đa
    retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
    retryAttempts?: number; // Số lần thử lại khi có lỗi
    userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
    headers?: Record<string, string>; // Các header HTTP bổ sung khi request
    cookies?: Record<string, string>; // Các cookie bổ sung khi truy cập trang

    stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
    cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
    waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
    javascriptEnabled?: boolean; // Có bật JavaScript hay không
    imagesEnabled?: boolean; // Có tải ảnh hay không
    cssEnabled?: boolean; // Có tải CSS hay không
}

export interface IRunFunctionExtractData {
    htmlContent: string;
    functionGenerator: string;
    mainContentSelector: string;
    isGetParentElement: boolean;
}

export interface IRunApiFunctionExtractData {
    data: Record<string, any>;
    functionGenerator: string;
}
