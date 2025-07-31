import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import path from 'path';

export class UtilsService {
    /**
     * generate hash from password or string
     * @param {string} password
     * @returns {string}
     */
    static generateHash(password: string): string {
        return bcrypt.hashSync(password, 10);
    }

    /**
     * generate random string
     * @param length
     */
    static generateRandomString(length: number): string {
        return Math.random()
            .toString(36)
            .replace(/[^a-zA-Z0-9]+/g, '')
            .substr(0, length);
    }
    /**
     * validate text with hash
     * @param {string} password
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    public static validateHash(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash || '');
    }

    public static getUtcNow(): Date {
        return new Date(new Date().toUTCString());
    }

    public static generateHashWithSalt(password: string, salt: string) {
        return bcrypt.hash(password, salt);
    }

    public static dateDiff(date1: Date, date2: Date, getBy: string): number {
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

    public static getUctDate(date: Date): Date {
        if (!date) return null;
        return new Date(date.toUTCString());
    }

    public static encodeBase64(str: string): string {
        return Buffer.from(str).toString('base64');
    }

    public static decodeBase64(str: string): string {
        return Buffer.from(str, 'base64').toString('utf8');
    }

    public static serializeQueryString(obj, prefix): string {
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

    public static mapToCamelCase(obj: any): any {
        /* eslint-disable */
        return _.mapKeys(obj, (value, key) => _.camelCase(key));
    }

    public static md5 = (data: string) => crypto.createHash('md5').update(data).digest('hex');

    public static sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    /**
     * Generate array of number from min to max, including min and max value
     * @param min number
     * @param max number
     */
    static arrayNumbers(min: number, max: number): number[] {
        return Array.from({ length: max - min + 1 }, (v, k) => k + min);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static flatten(arr: any): any {
        return arr.reduce(
            (flat: any, toFlatten: any) => flat.concat(Array.isArray(toFlatten) ? UtilsService.flatten(toFlatten) : toFlatten),
            [],
        );
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
}
