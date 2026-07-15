'use strict';

class MatrixPriceParser {

    extractPrices(rooms, periods) {

        const prices = [];

        for (const room of rooms) {

            for (const period of periods) {

                const price = room.row[period.startColumn];

                prices.push({
                    room: room.roomName,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    price
                });

            }

        }

        return prices;
    }

}

module.exports = MatrixPriceParser;