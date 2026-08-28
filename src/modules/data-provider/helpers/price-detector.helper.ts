export interface DetectedPriceResult {
    priceDetected: boolean;
    detectedPrice?: number;
    detectedCurrency?: string;
}

export class PriceDetectorHelper {
    private static readonly PRICE_REGEX =
        /(?:[$€£₫¥₹]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)|\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*([$€£₫¥₹]|USD|EUR|VND|GBP|JPY))/i;

    public static detectPriceInText(text?: string): DetectedPriceResult {
        if (!text) return { priceDetected: false };

        const match = text.match(this.PRICE_REGEX);
        if (!match) return { priceDetected: false };

        const rawPrice = match[1] || match[2];
        const rawCurrency = match[3] || text.match(/[$€£₫¥₹]|USD|EUR|VND/i)?.[0] || '$';

        if (!rawPrice) return { priceDetected: false };

        const cleanNumber = parseFloat(rawPrice.replace(/,/g, ''));
        if (isNaN(cleanNumber) || cleanNumber <= 0) return { priceDetected: false };

        return {
            priceDetected: true,
            detectedPrice: cleanNumber,
            detectedCurrency: rawCurrency.toUpperCase(),
        };
    }
}
