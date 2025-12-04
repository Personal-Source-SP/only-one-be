import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import path from 'path';

export class UtilsService {
    static generateHash(password: string): string {
        return bcrypt.hashSync(password, 10);
    }

    static generateRandomString(length: number): string {
        return Math.random()
            .toString(36)
            .replace(/[^a-zA-Z0-9]+/g, '')
            .substr(0, length);
    }

    static validateHash(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash || '');
    }

    static getUtcNow(): Date {
        return new Date(new Date().toUTCString());
    }

    static generateHashWithSalt(password: string, salt: string) {
        return bcrypt.hash(password, salt);
    }

    static dateDiff(date1: Date, date2: Date, getBy: string): number {
        const diffInTime = date1.getTime() - date2.getTime();
        let result = 0;
        switch (getBy) {
            case 'month':
                result = Math.round(diffInTime / (1000 * 3600 * 24 * 30));
                break;
            case 'day':
                result = Math.round(diffInTime / (1000 * 3600 * 24));
                break;
            case 'hour':
                result = Math.round(diffInTime / (1000 * 3600));
                break;
            case 'minute':
                result = Math.round(diffInTime / (1000 * 60));
                break;
            case 'second':
                result = Math.round(diffInTime / 1000);
                break;
            default:
                break;
        }
        return result;
    }

    static getUctDate(date: Date): Date {
        if (!date) return null;
        return new Date(date.toUTCString());
    }

    static encodeBase64(str: string): string {
        return Buffer.from(str).toString('base64');
    }

    static decodeBase64(str: string): string {
        return Buffer.from(str, 'base64').toString('utf8');
    }

    static serializeQueryString(obj: Record<string, any>, prefix: string): string {
        const str = [];
        let p;
        for (p in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(p)) {
                const k = prefix ? prefix + '[' + p + ']' : p,
                    v = obj[p];

                str.push(
                    v !== null && typeof v === 'object'
                        ? this.serializeQueryString(v, k)
                        : encodeURIComponent(k) + '=' + encodeURIComponent(v),
                );
            }
        }

        return str.join('&');
    }

    static md5(data: string): string {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static arrayNumbers(min: number, max: number): number[] {
        return Array.from({ length: max - min + 1 }, (v, k) => k + min);
    }

    static getFileExtensionFromUrl(urlString: string) {
        // Parse the URL
        const parsedUrl = new URL(urlString);
        // Extract the pathname
        const pathname = parsedUrl.pathname;
        // Use path.extname to get the file extension
        return path.extname(pathname);
    }

    static serializeError(error: unknown): string {
        if (error instanceof Error) {
            return JSON.stringify(error, Object.getOwnPropertyNames(error));
        }

        // Handle other types
        if (typeof error === 'object' && error !== null) {
            return JSON.stringify(error);
        }

        return String(error);
    }

    static buildUrl(baseUrl: string, query: string): string {
        const encodedQuery = encodeURIComponent(query);
        if (baseUrl.startsWith('http')) return `${baseUrl}${encodedQuery}`;

        const cleanPath = encodedQuery.startsWith('/') ? encodedQuery : `/${encodedQuery}`;
        return `${baseUrl}${cleanPath}`;
    }

    static convertCamelToSnakeCase<T = any>(obj: any): T {
        if (obj === null || obj === undefined) {
            return obj as T;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.convertCamelToSnakeCase(item)) as T;
        }

        if (obj instanceof Date || obj instanceof RegExp || obj instanceof Map || obj instanceof Set) {
            return obj as T;
        }

        if (typeof obj === 'object') {
            const converted: Record<string, any> = {};

            for (const [key, value] of Object.entries(obj)) {
                const snakeKey = _.snakeCase(key);
                converted[snakeKey] = this.convertCamelToSnakeCase(value);
            }

            return converted as T;
        }

        return obj as T;
    }

    static convertSnakeToCamelCase<T = any>(obj: any): T {
        if (obj === null || obj === undefined) {
            return obj as T;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.convertSnakeToCamelCase(item)) as T;
        }

        if (typeof obj === 'object' && obj.constructor === Object) {
            const converted: Record<string, any> = {};

            for (const [key, value] of Object.entries(obj)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                converted[camelKey] = this.convertSnakeToCamelCase(value);
            }

            return converted as T;
        }

        return obj as T;
    }
}
