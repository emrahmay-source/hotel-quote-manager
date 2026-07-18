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

        console.log('\n========== ROOMS ==========');
        console.log('Room count:', rooms.length);
        console.dir(rooms, { depth: null });

        const periods = periodParser.findPeriods(rows);

        console.log('\n========== PERIODS ==========');
        console.log('Period count:', periods.length);
        console.dir(periods, { depth: null });

        const prices = priceParser.findPrices(
            rows,
            rooms,
            periods
        );

        console.log('\n========== PRICES ==========');
        console.log('Price count:', prices.length);
        console.dir(prices.slice(0, 20), { depth: null });

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

        console.log('\n========== RESULT ==========');
        console.log('Result count:', result.length);
        console.dir(result.slice(0, 20), { depth: null });

        return {

            format: 'matrix',

            rooms: result

        };

    }

}

module.exports = MatrixParser;