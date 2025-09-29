export interface IJwtConfig {
    expire: string;
    appSecret: string;
    refreshExpire: string;
}

export interface IGoogleConfig {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    revokeEndpoint: string;
}
