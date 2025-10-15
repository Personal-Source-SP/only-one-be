// Base payload with common properties
interface BasePayloadDto {
    id: string;
    email: string;
    tokenType: 'accessToken' | 'refreshToken' | 'verify2FA';
}

// Access token payload
export interface PayloadDto extends BasePayloadDto {
    id: string;
    email: string;
    lastName: string;
    firstName: string;
}
