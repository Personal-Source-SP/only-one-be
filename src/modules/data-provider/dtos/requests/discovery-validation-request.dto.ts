import { EnumField, StringFieldOptional, UUIDField } from '../../../../decorators';
import { ValidationUserAction } from '../../enums';

export class TriggerValidationRequestDto {
    @StringFieldOptional({ description: 'Target keyword/product name to match against' })
    targetKeyword?: string;
}

export class SubmitUserActionRequestDto {
    @EnumField(() => ValidationUserAction, { description: 'User action on URL' })
    action: ValidationUserAction;

    @StringFieldOptional({ description: 'Reason for action' })
    reason?: string;
}

export class SubmitBulkUserActionRequestDto {
    @UUIDField({ each: true, description: 'List of Discovery URL IDs' })
    urlIds: string[];

    @EnumField(() => ValidationUserAction, { description: 'User action on URLs' })
    action: ValidationUserAction;

    @StringFieldOptional({ description: 'Reason for action' })
    reason?: string;
}

export class RevalidateUrlRequestDto {
    @StringFieldOptional({ description: 'Target keyword for revalidation' })
    targetKeyword?: string;
}

export class CancelValidationBatchRequestDto {
    @StringFieldOptional({ description: 'Reason for cancellation' })
    reason?: string;
}
