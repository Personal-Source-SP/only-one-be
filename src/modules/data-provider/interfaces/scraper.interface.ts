export interface IScraperRequest {
    url: string; // Đường dẫn URL cần lấy nội dung
    timeout?: number; // Thời gian chờ tối đa cho mỗi request (ms)
    waitForSelector?: string; // Chờ selector này xuất hiện trước khi lấy nội dung
    waitForTimeout?: number; // Thời gian chờ tối đa cho waitForSelector (ms)
    userAgent?: string; // Chuỗi user-agent giả lập cho trình duyệt
    viewport?: {
        // Kích thước cửa sổ trình duyệt (viewport)
        width: number; // Chiều rộng (px)
        height: number; // Chiều cao (px)
    };
    headers?: Record<string, string>; // Các header HTTP bổ sung khi request
    cookies?: Array<{
        // Các cookie bổ sung khi truy cập trang
        name: string; // Tên cookie
        value: string; // Giá trị cookie
        domain?: string; // Domain áp dụng cookie
        path?: string; // Đường dẫn áp dụng cookie
    }>;
    javascriptEnabled?: boolean; // Có bật JavaScript hay không
    imagesEnabled?: boolean; // Có tải ảnh hay không
    cssEnabled?: boolean; // Có tải CSS hay không
    cloudflareBypass?: boolean; // Bật chế độ vượt qua Cloudflare
    retryAttempts?: number; // Số lần thử lại khi có lỗi
    retryDelay?: number; // Thời gian delay giữa mỗi lần retry (ms)
    stealthMode?: boolean; // Bật chế độ ẩn danh chống bot
}

export interface IScraperResponse {
    status: 'success' | 'error';
    html?: string;
    error_code?: string;
    error_message?: string;
    execution_time?: number;
    url?: string;
    title?: string;
}
