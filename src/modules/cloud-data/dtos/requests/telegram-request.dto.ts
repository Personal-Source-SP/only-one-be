import { BooleanFieldOptional, EnumFieldOptional, NumberFieldOptional, StringFieldOptional } from '../../../../decorators';
import { TelegramParseMode } from '../../enums';

export class TelegramUploadDocumentRequest {
    @NumberFieldOptional()
    messageId?: number;

    @StringFieldOptional()
    chatId?: string;

    @StringFieldOptional()
    caption?: string;

    @EnumFieldOptional(() => TelegramParseMode)
    parseMode?: TelegramParseMode;

    @NumberFieldOptional()
    replyToMessageId?: number;

    @BooleanFieldOptional()
    disableNotification?: boolean;
}
