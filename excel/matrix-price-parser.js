'use strict';

class MatrixPriceParser {

    findPrices(rows, rooms, periods) {

        const prices = [];

        for (const room of rooms) {

            for (const period of periods) {

                // Her dönem için fiyat tek kolonda
                const col = period.startColumn;

                const value = room.rowData[col];

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

                prices.push({

                    roomRow: room.row,

                    roomName: room.roomName,

                    boardType: period.boardType || '',

                    period: period.name,

                    startDate: period.startDate,

                    endDate: period.endDate,

                    currency: period.currency || 'TRY',

                    price: numericPrice

                });

            }

        }

        return prices;

    }

}

module.exports = MatrixPriceParser;