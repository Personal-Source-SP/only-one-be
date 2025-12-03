export interface IJwtConfig {
    expire: string;
    appSecret: string;
    refreshExpire: string;
}

export interface IRedisConfig {
    host: string;
    port: number;
    password: string;
}

export interface IScraperConfig {
    url: string;
    secretKey: string;
}

export interface ISchedulerConfig {
    enabled: boolean;
    removedOnCompleted: boolean;
}

export interface ITelegramConfig {
    apiBaseUrl: string;
    fileBaseUrl: string;
    defaultChannelId: string;
}
