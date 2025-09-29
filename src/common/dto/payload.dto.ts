// Base payload with common properties
interface BasePayloadDto {
    id: string;
    email: string;
    tokenType: 'accessToken' | 'refreshToken' | 'verify2FA';
}

// Access token payload
export interface PayloadDto extends BasePayloadDto {
    tokenType: 'accessToken';
    lastName: string;
    firstName: string;

    name?: string;
    role?: string;
    avatar?: string;
}
