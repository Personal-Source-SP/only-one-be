export const parseBooleanFilter = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return false;
};

export const parseFilterValueToArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim());
    }
    return [];
};
