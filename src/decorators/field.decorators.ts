import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsDefined,
    IsEmail,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
    NotEquals,
    ValidateNested,
} from 'class-validator';

import { ApiEnumProperty, ApiUUIDProperty } from './property.decorators';
import { PhoneNumberSerializer, ToArray, ToBoolean, ToLowerCase, ToUpperCase, Trim } from './transform.decorators';
import { IsNullable, IsPassword as IsPasswordValidator, IsPhoneNumber, IsTmpKey as IsTemporaryKey } from './validator.decorators';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any, Arguments extends unknown[] = any[]> = new (...arguments_: Arguments) => T;

export interface IFieldOptions extends Record<string, any> {
    each?: boolean;
    swagger?: boolean;
    nullable?: boolean;
    groups?: string[];
}

export interface INumberFieldOptions extends IFieldOptions {
    min?: number;
    max?: number;
    int?: boolean;
    isPositive?: boolean;
}

export interface IStringFieldOptions extends IFieldOptions {
    minLength?: number;
    maxLength?: number;
    toLowerCase?: boolean;
    toUpperCase?: boolean;
    trim?: boolean;
}

export type IClassFieldOptions = IFieldOptions;
export type IBooleanFieldOptions = IFieldOptions;
export type IEnumFieldOptions = IFieldOptions;

export function NumberField(options: INumberFieldOptions = {}): PropertyDecorator {
    const decorators = [Type(() => Number)];

    if (options.nullable) {
        decorators.push(IsNullable({ each: options.each }));
    } else {
        decorators.push(NotEquals(null, { each: options.each }));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: Number, ...options } as any));
    }

    if (options.each) {
        decorators.push(ToArray());
    }

    if (options.int) {
        decorators.push(IsInt({ each: options.each }));
    } else {
        decorators.push(IsNumber({}, { each: options.each }));
    }

    if (typeof options.min === 'number') {
        decorators.push(Min(options.min, { each: options.each }));
    }

    if (typeof options.max === 'number') {
        decorators.push(Max(options.max, { each: options.each }));
    }

    if (options.isPositive) {
        decorators.push(IsPositive({ each: options.each }));
    }

    return applyDecorators(...decorators);
}

export function NumberFieldOptional(options: INumberFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), NumberField({ required: false, ...options }));
}

export function StringField(options: IStringFieldOptions = {}): PropertyDecorator {
    const decorators = [Type(() => String), IsString({ each: options.each })];

    if (options.trim !== false) {
        decorators.push(Trim());
    }

    if (options.nullable) {
        decorators.push(IsNullable({ each: options.each }));
    } else {
        decorators.push(NotEquals(null, { each: options.each }));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: String, ...options, isArray: options.each } as any));
    }

    const minLength = options.minLength || 0;
    decorators.push(MinLength(minLength, { each: options.each }));

    if (options.maxLength) {
        decorators.push(MaxLength(options.maxLength, { each: options.each }));
    }

    if (options.toLowerCase) {
        decorators.push(ToLowerCase());
    }

    if (options.toUpperCase) {
        decorators.push(ToUpperCase());
    }

    if (options.each) {
        decorators.push(ToArray());
    }

    return applyDecorators(...decorators);
}

export function StringFieldOptional(options: IStringFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), StringField({ required: false, ...options }));
}

export function ObjectFieldOptional(options: IFieldOptions = {}): PropertyDecorator {
    const decorators = [IsOptional(), IsObject()];

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: 'object', required: false, ...options } as any));
    }

    return applyDecorators(...decorators);
}

export function PasswordField(options: IStringFieldOptions = {}): PropertyDecorator {
    const decorators = [StringField({ minLength: 6, ...options }), IsPasswordValidator()];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    return applyDecorators(...decorators);
}

export function PasswordFieldOptional(options: IStringFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), PasswordField({ required: false, ...options }));
}

export function BooleanField(options: IBooleanFieldOptions = {}): PropertyDecorator {
    const decorators = [ToBoolean(), IsBoolean()];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: Boolean, ...options } as any));
    }

    return applyDecorators(...decorators);
}

export function BooleanFieldOptional(options: IBooleanFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), BooleanField({ required: false, ...options }));
}

export function TmpKeyField(options: IStringFieldOptions = {}): PropertyDecorator {
    const decorators = [StringField(options), IsTemporaryKey({ each: options.each })];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: String, ...options, isArray: options.each } as any));
    }

    return applyDecorators(...decorators);
}

export function TmpKeyFieldOptional(options: IStringFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), TmpKeyField({ required: false, ...options }));
}

export function EnumField<TEnum extends object>(getEnum: () => TEnum, options: IEnumFieldOptions = {}): PropertyDecorator {
    const enumValue = getEnum();
    const decorators = [Trim(), IsEnum(enumValue, { each: options.each })];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.each) {
        decorators.push(ToArray());
    }

    if (options.swagger !== false) {
        decorators.push(ApiEnumProperty(getEnum, { ...options, isArray: options.each }));
    }

    return applyDecorators(...decorators);
}

export function EnumFieldOptional<TEnum extends object>(getEnum: () => TEnum, options: IEnumFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), EnumField(getEnum, { required: false, ...options }));
}

export function ClassField<TClass extends Constructor>(getClass: () => TClass, options: IClassFieldOptions = {}): PropertyDecorator {
    const { each, swagger, ...swaggerOptions } = options;
    const decorators = [Type(getClass)];

    if (each) {
        decorators.push(ValidateNested({ each: true }));
    }

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (swagger !== false) {
        decorators.push(
            ApiProperty({
                ...swaggerOptions,
                type: () => getClass(),
                isArray: swaggerOptions.isArray ?? each,
            } as any),
        );
    }

    return applyDecorators(...decorators);
}

export function ClassFieldOptional<TClass extends Constructor>(
    getClass: () => TClass,
    options: IClassFieldOptions = {},
): PropertyDecorator {
    return applyDecorators(IsOptional(), ClassField(getClass, { required: false, ...options }));
}

export function EmailField(options: IStringFieldOptions = {}): PropertyDecorator {
    const decorators = [IsEmail({}, { each: options.each }), StringField({ toLowerCase: true, ...options })];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: String, ...options } as any));
    }

    return applyDecorators(...decorators);
}

export function EmailFieldOptional(options: IStringFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), EmailField({ required: false, ...options }));
}

export function PhoneField(options: IFieldOptions = {}): PropertyDecorator {
    const decorators = [Trim(), IsPhoneNumber(), PhoneNumberSerializer()];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: String, ...options } as any));
    }

    return applyDecorators(...decorators);
}

export function PhoneFieldOptional(options: IFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), PhoneField({ required: false, nullable: true, ...options }));
}

export function UUIDField(options: IFieldOptions = {}): PropertyDecorator {
    const decorators = [Trim(), Type(() => String), IsUUID('4', { each: options.each })];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiUUIDProperty(options));
    }

    if (options.each) {
        decorators.push(ToArray());
    }

    return applyDecorators(...decorators);
}

export function UUIDFieldOptional(options: IFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), UUIDField({ required: false, ...options }));
}

export function URLField(options: IStringFieldOptions = {}): PropertyDecorator {
    const decorators = [StringField(options), IsUrl({}, { each: true })];

    if (options.nullable) {
        decorators.push(IsNullable({ each: options.each }));
    } else {
        decorators.push(NotEquals(null, { each: options.each }));
    }

    return applyDecorators(...decorators);
}

export function URLFieldOptional(options: IStringFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), URLField({ required: false, ...options }));
}

export function DateField(options: IFieldOptions = {}): PropertyDecorator {
    const decorators = [Type(() => Date), IsDate()];

    if (options.nullable) {
        decorators.push(IsNullable());
    } else {
        decorators.push(NotEquals(null));
    }

    if (options.swagger !== false) {
        decorators.push(ApiProperty({ type: Date, ...options } as any));
    }

    return applyDecorators(...decorators);
}

export function DateFieldOptional(options: IFieldOptions = {}): PropertyDecorator {
    return applyDecorators(IsOptional(), DateField({ ...options, required: false }));
}
