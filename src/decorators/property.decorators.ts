import type { ApiPropertyOptions } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export function getVariableName<TResult>(getVar: () => TResult): string | undefined {
    try {
        const m = /\(\)=>(.*)/.exec(getVar.toString().replaceAll(/(\r\n|\n|\r|\s)/gm, ''));
        if (!m) return undefined;
        const fullMemberName = m[1]!;
        const memberParts = fullMemberName.split('.');
        return memberParts[memberParts.length - 1];
    } catch {
        return undefined;
    }
}

export function ApiBooleanProperty(options: Record<string, any> = {}): PropertyDecorator {
    return ApiProperty({ type: Boolean, ...options } as any);
}

export function ApiBooleanPropertyOptional(options: Record<string, any> = {}): PropertyDecorator {
    return ApiBooleanProperty({ required: false, ...options });
}

export function ApiUUIDProperty(options: Record<string, any> & Partial<{ each: boolean }> = {}): PropertyDecorator {
    return ApiProperty({
        type: options.each ? [String] : String,
        format: 'uuid',
        isArray: options.each,
        ...options,
    } as any);
}

export function ApiUUIDPropertyOptional(options: Record<string, any> & Partial<{ each: boolean }> = {}): PropertyDecorator {
    return ApiUUIDProperty({ required: false, ...options });
}

export function ApiEnumProperty<TEnum>(getEnum: () => TEnum, options: Record<string, any> & { each?: boolean } = {}): PropertyDecorator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enumValue = getEnum() as any;
    const enumName = getVariableName(getEnum);

    return ApiProperty({
        enum: enumValue,
        enumName,
        ...options,
    } as any);
}

export function ApiEnumPropertyOptional<TEnum>(
    getEnum: () => TEnum,
    options: Record<string, any> & { each?: boolean } = {},
): PropertyDecorator {
    return ApiEnumProperty(getEnum, { required: false, ...options });
}
