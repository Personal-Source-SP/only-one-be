import { MimeType } from '../../../common/enums/mime-type';
import { GoogleApiType, GoogleDriveType } from '../enums';

export interface IGoogleAuthResponse {
    access_token: string;
    refresh_token: string;
    expires_in: string;
    scope: string;
    token_type: string;
}

export interface IGenerateParams {
    driveFolderId?: string;
    type?: GoogleDriveType;
    fileTypes?: MimeType[];
    modifiedTimeFrom?: string; // ISO string
    modifiedTimeTo?: string; // ISO string
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
    googleAuthId: string;
    apiType: GoogleApiType;
    params?: IGoogleApiParams;
}
