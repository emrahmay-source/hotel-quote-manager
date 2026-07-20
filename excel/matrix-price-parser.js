'use strict';

const XLSX = require('xlsx');

class MatrixPriceParser {

    findPrices(rows, rooms, periods, sheet) {

        const prices = [];

        for (const room of rooms) {

            for (const period of periods) {

                // Her dönem için fiyat tek kolonda
                const col = period.startColumn;

              const value = room.rowData[col];

const cellAddress = XLSX.utils.encode_cell({
    r: room.row,
    c: col
});

const cell = sheet[cellAddress];

console.log(cellAddress, cell);
                if (
                    value === '' ||
                    value === null ||
                    value === undefined
                ) {
                    continue;
                }

                const numericPrice = Number(
                    String(value)
                        .replace(',', '.')
                        .replace(/[^\d.]/g, '')
                );

                if (!Number.isFinite(numericPrice)) {
                    continue;
                }

                // Gece sayıları fiyat değildir.
   if (numericPrice < 30) {
    continue;
}

let currency = 'TRY';

if (cell?.w) {

    if (cell.w.includes('€'))
        currency = 'EUR';

    else if (cell.w.includes('$'))
        currency = 'USD';

    else if (cell.w.includes('£'))
        currency = 'GBP';

    else if (cell.w.includes('₺'))
        currency = 'TRY';
}

console.log({
    value,
    currency,
    start: period.startDate
});

                prices.push({

                    roomRow: room.row,

                    roomName: room.roomName,

                    boardType: period.boardType || '',

                    period: period.name,

                    startDate: period.startDate,

                    endDate: period.endDate,

                    currency: currency,

                    price: numericPrice

                });

            }

        }

        return prices;

    }

}

module.exports = MatrixPriceParser;