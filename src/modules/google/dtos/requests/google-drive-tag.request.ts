import { StringField, UUIDField } from '../../../../decorators';

export class CreateTagRequestDto {
    @StringField({ description: 'Tag name' })
    name: string;
}

export class AssignTagsToFileRequestDto {
    @UUIDField({ description: 'File id (uuid)' })
    fileId: string;

    @StringField({ each: true, description: 'Array of tag names' })
    tags: string[];
}

export class RemoveTagFromFileRequestDto {
    @UUIDField({ description: 'File id (uuid)' })
    fileId: string;

    @StringField({ description: 'Tag name' })
    tag: string;
}
