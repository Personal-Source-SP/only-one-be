import { MimeType } from '../../../common/enums';

export interface IGoogleDriveFile {
    id: string;
    name: string;
    mimeType: MimeType;
    webViewLink: string;
    webContentLink: string;
    thumbnailLink: string;

    size?: number;
    trashed?: boolean;
    starred?: boolean;
    parents?: string[];
    modifiedTime?: string;
}
