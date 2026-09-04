import { NumberField, NumberFieldOptional, StringField, StringFieldOptional } from '../../../../decorators';

export class UpdateGoogleAuthRequestDto {
    @StringField({ description: 'Email from Google OAuth' })
    email: string;

    @StringField({ description: 'Google token from Google OAuth' })
    accessToken: string;

    @NumberField({ description: 'Expires in from Google OAuth' })
    expiresIn: number;

    @StringField({ description: 'Scope from Google OAuth' })
    scope: string;

    @StringField({ description: 'Token type from Google OAuth' })
    tokenType: string;

    @StringFieldOptional({ description: 'Refresh token from Google OAuth' })
    refreshToken?: string;

    @NumberFieldOptional({ description: 'Refresh token expires in from Google OAuth' })
    refreshTokenExpiresIn?: number;
}
