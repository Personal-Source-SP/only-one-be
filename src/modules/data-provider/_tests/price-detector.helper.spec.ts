import { PriceDetectorHelper } from '../helpers/price-detector.helper';

describe('PriceDetectorHelper', () => {
    it('should detect USD prices with dollar sign', () => {
        const result = PriceDetectorHelper.detectPriceInText('Sony WH-1000XM4 Wireless Headphones - $348.00');
        expect(result.priceDetected).toBe(true);
        expect(result.detectedPrice).toBe(348);
        expect(result.detectedCurrency).toBe('$');
    });

    it('should detect VND prices', () => {
        const result = PriceDetectorHelper.detectPriceInText('Bàn phím cơ không dây RGB - 1.250.000 ₫');
        expect(result.priceDetected).toBe(true);
        expect(result.detectedPrice).toBe(1.25);
        expect(result.detectedCurrency).toBe('₫');
    });

    it('should detect EUR prices', () => {
        const result = PriceDetectorHelper.detectPriceInText('Item description with €49.99 sale price');
        expect(result.priceDetected).toBe(true);
        expect(result.detectedPrice).toBe(49.99);
        expect(result.detectedCurrency).toBe('€');
    });

    it('should return false for text without price', () => {
        const result = PriceDetectorHelper.detectPriceInText('Just a random product title without any numbers or currencies');
        expect(result.priceDetected).toBe(false);
        expect(result.detectedPrice).toBeUndefined();
    });

    it('should return false for undefined input', () => {
        const result = PriceDetectorHelper.detectPriceInText(undefined);
        expect(result.priceDetected).toBe(false);
    });
});
