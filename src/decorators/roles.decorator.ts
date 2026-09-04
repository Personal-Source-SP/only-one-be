import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'roles';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Roles = (...roles: string[]): CustomDecorator => SetMetadata(ROLE_KEY, roles);
