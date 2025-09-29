export interface IGoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    webContentLink: string;
    thumbnailLink: string;

    size?: number;
    trashed?: boolean;
    starred?: boolean;
    parents?: string[];
    modifiedTime?: string;
}
