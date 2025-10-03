import { parsePrice } from './price-parser';

describe('parsePrice', () => {
    it('should parse price with dot decimal separator', () => {
        expect(parsePrice('123.45')).toBe(123.45);
        expect(parsePrice('1,234.56')).toBe(1234.56);
        expect(parsePrice('$1,234.56')).toBe(1234.56);
        expect(parsePrice('1.234.56')).toBe(1.234);
    });

    it('should parse price with comma decimal separator', () => {
        expect(parsePrice('123,45')).toBe(123.45);
        expect(parsePrice('1.234,56')).toBe(1234.56);
        expect(parsePrice('€1.234,56')).toBe(1234.56);
        expect(parsePrice('1,234,56')).toBe(1.234);
    });

    it('should handle prices without decimal part', () => {
        expect(parsePrice('123')).toBe(123.0);
        expect(parsePrice('1,234')).toBe(1.234);
        expect(parsePrice('1.234')).toBe(1.234);
        expect(parsePrice('$1,234')).toBe(1.234);
    });

    it('should handle numeric input', () => {
        expect(parsePrice(123)).toBe(123.0);
        expect(parsePrice(123.45)).toBe(123.45);
        expect(parsePrice(1234.56)).toBe(1234.56);
    });

    it('should handle special cases', () => {
        expect(parsePrice('abc123.45xyz')).toBe(123.45);
        expect(parsePrice('price: $1,234.56')).toBe(1234.56);
        expect(parsePrice('1234.')).toBe(1234.0);
        expect(parsePrice('1234,')).toBe(1234.0);
    });

    it('should handle invalid input', () => {
        expect(parsePrice('')).toBe(0.0);
        expect(parsePrice('abc')).toBe(0.0);
        expect(parsePrice('.')).toBe(0.0);
        expect(parsePrice(',')).toBe(0.0);
    });

    it('should handle various currency formats', () => {
        expect(parsePrice('€1.234,56')).toBe(1234.56);
        expect(parsePrice('US$ 1.234,56')).toBe(1234.56);
        expect(parsePrice('£1,234.56')).toBe(1234.56);
        expect(parsePrice('R$1.234,56')).toBe(1234.56);
        expect(parsePrice('1 234,56 руб')).toBe(1234.56);
        expect(parsePrice('1,234.56 ₪')).toBe(1234.56);
    });
});
