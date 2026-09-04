import { Transform } from 'class-transformer';
import { castArray, isArray, isNil, map, trim } from 'lodash';

/**
 * @description Trim spaces from start and end, replace multiple spaces with one.
 */
export function Trim(): PropertyDecorator {
    return Transform((params) => {
        const value = params.value as string[] | string;

        if (isArray(value)) {
            return map(value, (v) => (typeof v === 'string' ? trim(v).replaceAll(/\s\s+/g, ' ') : v));
        }

        if (typeof value === 'string') {
            return trim(value).replaceAll(/\s\s+/g, ' ');
        }

        return value;
    });
}

export function ToBoolean(): PropertyDecorator {
    return Transform(
        (params) => {
            switch (params.value) {
                case 'true':
                case true:
                case 1:
                case '1': {
                    return true;
                }
                case 'false':
                case false:
                case 0:
                case '0': {
                    return false;
                }
                default: {
                    return params.value;
                }
            }
        },
        { toClassOnly: true },
    );
}

/**
 * @description Convert string or number to integer
 */
export function ToInt(): PropertyDecorator {
    return Transform(
        (params) => {
            const value = params.value as string;
            if (isNil(value) || value === '') return value;
            return Number.parseInt(value, 10);
        },
        { toClassOnly: true },
    );
}

/**
 * @description Transforms to array, especially for query params
 */
export function ToArray(): PropertyDecorator {
    return Transform(
        (params) => {
            const value = params.value;
            if (isNil(value)) {
                return [];
            }
            return castArray(value);
        },
        { toClassOnly: true },
    );
}

export function ToLowerCase(): PropertyDecorator {
    return Transform(
        (params) => {
            const value = params.value;
            if (!value) return value;
            if (!Array.isArray(value)) {
                return typeof value === 'string' ? value.toLowerCase() : value;
            }
            return value.map((v) => (typeof v === 'string' ? v.toLowerCase() : v));
        },
        { toClassOnly: true },
    );
}

export function ToUpperCase(): PropertyDecorator {
    return Transform(
        (params) => {
            const value = params.value;
            if (!value) return value;
            if (!Array.isArray(value)) {
                return typeof value === 'string' ? value.toUpperCase() : value;
            }
            return value.map((v) => (typeof v === 'string' ? v.toUpperCase() : v));
        },
        { toClassOnly: true },
    );
}

export function PhoneNumberSerializer(): PropertyDecorator {
    return Transform(({ value }) => {
        if (!value || typeof value !== 'string') return value;
        const cleaned = value.replaceAll(/[^\d+]/g, '');
        return cleaned;
    });
}

export function JSONToObject(): PropertyDecorator {
    return Transform(
        ({ value }) => {
            if (isNil(value)) return {};
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            }
            return value;
        },
        { toClassOnly: true },
    );
}

export function JSONToArray(): PropertyDecorator {
    return Transform(
        ({ value }) => {
            if (isNil(value)) return [];
            if (typeof value === 'string') {
                try {
                    const json = JSON.parse(value);
                    return isArray(json) ? json : [json];
                } catch {
                    return [];
                }
            }
            if (isArray(value)) {
                return value.map((item: any) => {
                    if (typeof item === 'string') {
                        try {
                            return JSON.parse(item);
                        } catch {
                            return item;
                        }
                    }
                    return item;
                });
            }
            return value;
        },
        { toClassOnly: true },
    );
}
