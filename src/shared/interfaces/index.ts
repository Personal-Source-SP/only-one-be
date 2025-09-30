export interface II18nRequest {
    i18nLang: string;
}

export interface IUploadFileResult {
    result: boolean;
    name?: string;
}

export interface IPuppeteerOptions {
    args?: string[];
    slowMo?: number;
    dumpio?: boolean;
    headless?: boolean;
    devtools?: boolean;
}
