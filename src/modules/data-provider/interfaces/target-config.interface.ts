export interface ITargetConfig {
    functionGenerator: string; // Function generator
    mainContentSelector: string; // Main selector for getting main content
    isGetParentElement: boolean; // Get parent element of main content

    retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
    retryAttempts?: number; // Số lần thử lại khi có lỗi
    stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
    cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
    waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
    userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
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
