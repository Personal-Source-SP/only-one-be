import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Permissions = (...permissions: string[]): CustomDecorator => SetMetadata(PERMISSION_KEY, permissions);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Permission = (...permissions: string[]): CustomDecorator => Permissions(...permissions);
