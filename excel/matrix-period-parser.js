'use strict';

class MatrixPeriodParser {

    findPeriods(rows) {

        const periods = [];

        let dateRowIndex = -1;

        // İlk 15 satır içinde tarih satırını ara
        for (let i = 0; i < Math.min(rows.length, 15); i++) {

            const row = rows[i];

            if (!Array.isArray(row)) continue;

            let count = 0;

            row.forEach(cell => {

                if (this.isDate(cell)) {
                    count++;
                }

            });

            if (count >= 2) {
                dateRowIndex = i;
                break;
            }

        }

        if (dateRowIndex === -1) {
            return periods;
        }

        const dateRow = rows[dateRowIndex];

        let lastDate = null;
        let startColumn = null;

        for (let col = 0; col < dateRow.length; col++) {

            const cell = dateRow[col];

            if (!this.isDate(cell)) {
                continue;
            }

            const currentDate = this.parseDate(cell);

            if (!lastDate) {
                lastDate = currentDate;
                startColumn = col;
                continue;
            }

            // fiyat sütununun bir üst satırındaki hücreyi oku
const currencyRow = rows[dateRowIndex + 1] || [];

const currencyCell = String(currencyRow[startColumn] || "").toUpperCase();

let currency = "TRY";

if (currencyCell.includes("€") || currencyCell.includes("EUR")) {
    currency = "EUR";
}
else if (currencyCell.includes("$") || currencyCell.includes("USD")) {
    currency = "USD";
}
else if (currencyCell.includes("£") || currencyCell.includes("GBP")) {
    currency = "GBP";
}

periods.push({

    name: `${this.formatDate(lastDate)} - ${this.formatDate(currentDate)}`,

    startColumn,

    endColumn: col,

    startDate: lastDate,

    endDate: currentDate,

    boardType: '',

    currency: this.detectCurrency(rows[dateRowIndex + 2]?.[startColumn]) || "TRY"

});

            lastDate = currentDate;
            startColumn = col;

        }

        return periods;

    }

    isDate(value) {

        if (value instanceof Date) {
            return true;
        }

        if (!value) {
            return false;
        }

        const text = String(value).trim();

        return /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(text);

    }

    parseDate(value) {

        if (value instanceof Date) {
            return value;
        }

        const p = String(value)
            .replace(/\//g,'.')
            .replace(/-/g,'.')
            .split('.');

        return new Date(
            Number(p[2]),
            Number(p[1]) - 1,
            Number(p[0])
        );

    }

    formatDate(date) {

        const d = String(date.getDate()).padStart(2,'0');
        const m = String(date.getMonth()+1).padStart(2,'0');
        const y = date.getFullYear();

        return `${d}.${m}.${y}`;

    }
detectCurrency(cell) {

    const text = String(cell ?? "");

    if (text.includes("€")) return "EUR";
    if (text.includes("$")) return "USD";
    if (text.includes("£")) return "GBP";
    if (text.includes("₺")) return "TRY";

    return null;
}
}

module.exports = MatrixPeriodParser;