import { GoogleApiType, GoogleDriveFileType, GoogleDriveType } from '../enums';

export interface IGoogleAuthResponse {
    access_token: string;
    refresh_token: string;
    expires_in: string;
    scope: string;
    token_type: string;
}

export interface IGenerateParams {
    pageSize?: number;
    folderId?: string;
    type?: GoogleDriveType;
    fileTypes?: GoogleDriveFileType[];
    customQuery?: string;
    nextPageToken?: string;
    isTrashed?: boolean;
    isStarred?: boolean;
}

export interface IGoogleApiParams {
    q?: string;
    fields?: string;
    pageSize?: string;
    pageToken?: string;
}

export interface IGoogleApiRequest {
    userId: string;
    googleAuthId: string;
    apiType: GoogleApiType;
    params?: IGoogleApiParams;
}
