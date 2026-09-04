import { StringFieldOptional } from '../../../../decorators';

export class UpdateGoogleDriveFolderRequest {
    @StringFieldOptional({ description: 'Filter by name' })
    name?: string;

    @StringFieldOptional({ description: 'Filter by parent folder id' })
    parentFolderId?: string;
}
