export interface IGoogleApiResponse<T> {
    files: T[];
    nextPageToken?: string;
}
