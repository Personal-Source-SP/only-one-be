import type { ValidationOptions } from 'class-validator';
import { IsPhoneNumber as isPhoneNumber, Matches, registerDecorator, ValidateIf } from 'class-validator';
import { isString } from 'lodash';

export function IsPhoneNumber(
    validationOptions?: ValidationOptions & {
        region?: Parameters<typeof isPhoneNumber>[0];
    },
): PropertyDecorator {
    return isPhoneNumber(validationOptions?.region ?? 'VN', {
        message: 'error.phoneNumber',
        ...validationOptions,
    });
}

export function IsTmpKey(validationOptions?: ValidationOptions): PropertyDecorator {
    return (object: object, propertyName: string | symbol) => {
        registerDecorator({
            propertyName: propertyName as string,
            name: 'tmpKey',
            target: object.constructor,
            options: validationOptions,
            validator: {
                validate(value: string): boolean {
                    return isString(value) && value.startsWith('tmp/');
                },
                defaultMessage(): string {
                    return 'error.invalidTmpKey';
                },
            },
        });
    };
}

export function IsUndefinable(options?: ValidationOptions): PropertyDecorator {
    return ValidateIf((_obj, value) => value !== undefined, options);
}

export function IsNullable(options?: ValidationOptions): PropertyDecorator {
    return ValidateIf((_obj, value) => value !== null, options);
}

export function IsPassword(validationOptions?: ValidationOptions): PropertyDecorator {
    return Matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]*$/, {
        message: 'error.invalidPassword',
        ...validationOptions,
    });
}
