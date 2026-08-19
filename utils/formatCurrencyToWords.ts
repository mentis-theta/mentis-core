
const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const TEENS = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function convertGroup(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";

    let str = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
        str += HUNDREDS[c];
        if (d > 0 || u > 0) str += " e ";
    }

    if (d === 1) {
        str += TEENS[u];
    } else {
        if (d > 1) {
            str += TENS[d];
            if (u > 0) str += " e ";
        }
        if (u > 0 && d !== 1) {
            str += UNITS[u];
        }
    }
    return str;
}

export function formatCurrencyToWords(amount: number): string {
    if (amount === 0) return "zero reais";

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = "";

    // Handle Integer Part
    if (integerPart > 0) {
        // Limited to millions for this scope, can be expanded
        const millions = Math.floor(integerPart / 1_000_000);
        const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
        const remainder = integerPart % 1_000;

        if (millions > 0) {
            result += convertGroup(millions) + (millions === 1 ? " milhão" : " milhões");
            if (thousands > 0 || remainder > 0) result += ", ";
        }

        if (thousands > 0) {
            const thousandStr = convertGroup(thousands);
            result += (thousandStr === "um" ? "" : thousandStr) + " mil"; // "um mil" -> "mil"
            if (remainder > 0) {
                if (remainder < 100 || remainder % 100 === 0) result += " e ";
                else result += ", ";
            }
        }

        if (remainder > 0) {
            result += convertGroup(remainder);
        }

        result += (integerPart === 1 ? " real" : " reais");
    }

    // Handle Decimal Part
    if (decimalPart > 0) {
        if (integerPart > 0) result += " e ";
        result += convertGroup(decimalPart) + (decimalPart === 1 ? " centavo" : " centavos");
    }

    return result.replace(/\s+/g, ' ').trim();
}
