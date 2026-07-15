'use strict';

const MatrixRoomParser = require('./matrix-room-parser');
const MatrixPeriodParser = require('./matrix-period-parser');
const MatrixPriceParser = require('./matrix-price-parser');

class MatrixParser {

    parse(rows) {

        const roomParser = new MatrixRoomParser();
        const periodParser = new MatrixPeriodParser();
        const priceParser = new MatrixPriceParser();

        const rooms = roomParser.findRoomRows(rows);

        const periods = periodParser.findPeriods(rows);

        const prices = priceParser.findPrices(
            rows,
            rooms,
            periods
        );

        const result = [];

        for (const price of prices) {

            const room = rooms.find(r => r.row === price.roomRow);

            if (!room) continue;

            result.push({

                roomType: room.roomName,

                boardType: price.boardType || '',

                period: price.period,

                startDate: price.startDate || '',

                endDate: price.endDate || '',

                currency: price.currency || 'TRY',

                price: price.price,

                features: room.features || []

            });

        }

        return {

            format: 'matrix',

            rooms: result

        };

    }

}

module.exports = MatrixParser;