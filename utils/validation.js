// Luhn Algorithm to validate credit card number
export function isValidCardNumber(cardNumber) {
    let sum = 0;
    let alternate = false;
    const digits = cardNumber.split('').reverse().map(Number);

    for (const digit of digits) {
        let num = digit;
        if (alternate) {
            num *= 2;
            if (num > 9) num -= 9;
        }
        sum += num;
        alternate = !alternate;
    }
    return sum % 10 === 0;
}

// Validate expiry date (should be in the future)
export function isValidExpiry(month, year) {
    const now = new Date();
    const inputDate = new Date(year, month - 1, 1); // Month is 0-based in JS Dates
    return inputDate > now;
}
