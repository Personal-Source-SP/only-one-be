export interface IGoogleAuthResponse {
    access_token: string;
    refresh_token: string;
    expires_in: string;
    scope: string;
    token_type: string;
}

export interface IGoogleApiParams {
    q?: string;
    fields?: string;
    pageSize?: string;
    pageToken?: string;
}
