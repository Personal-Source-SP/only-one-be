import { ClassField, EmailField, PasswordField, URLField } from '../../../../decorators';

export class EmailItem {
    @EmailField({
        description: 'The email to simulate',
        example: 'test@example.com',
    })
    email: string;

    @PasswordField({
        description: 'The password to simulate',
        example: 'password',
    })
    password: string;
}

export class SimulateUnlucidAiRequest {
    @ClassField(() => EmailItem, {
        each: true,
        description: 'The emails to simulate',
    })
    emails: EmailItem[];

    @URLField({
        example: 'https://www.google.com',
        description: 'The referral link to simulate',
    })
    referralLink: string;
}
