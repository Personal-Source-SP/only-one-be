import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsEqualField(property: string, validationOptions?: ValidationOptions) {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsEqualField',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = (args.object as any)[relatedPropertyName];
                    return value === relatedValue;
                },
            },
        });
    };
}
