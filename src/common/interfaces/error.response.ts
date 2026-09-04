export interface ErrorResponse {
    code: string;
    message?: string;
    params?: Record<string, any>;
}
