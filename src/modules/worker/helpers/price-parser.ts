const filterNumbers = (str: string): string => str.replace(/[^\d]/g, '');
const filterNumbersDotsAndCommas = (str: string): string => str.replace(/[^\d.,]/g, '').replace(/[.,]$/, '');

const getDecimalSymbol = (str: string): string | undefined => {
    const strFiltered = filterNumbersDotsAndCommas(str);
    const endWithZero = strFiltered[strFiltered.length - 1] === '0';

    for (let i = strFiltered.length; i > 0; i--) {
        if (strFiltered.length - i + 1 > 3 && endWithZero) {
            return undefined;
        }

        const currentChar = strFiltered[i - 1];

        if ([',', '.'].includes(currentChar)) {
            return currentChar;
        }
    }

    return undefined;
};

const parsePrice = (input: string | number): number => {
    const str = String(input);
    let decimalPart = '00';
    const decimalSymbol = getDecimalSymbol(str);

    if (decimalSymbol) {
        decimalPart = str.split(decimalSymbol)[1] || decimalPart;
    }

    const integerPart = str.split(decimalSymbol)[0];

    return Number(filterNumbers(integerPart) + '.' + filterNumbers(decimalPart));
};

export { parsePrice };
