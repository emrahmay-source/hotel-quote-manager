'use strict';

const MatrixRoomParser = require('./matrix-room-parser');
const MatrixPeriodParser = require('./matrix-period-parser');
const MatrixPriceParser = require('./matrix-price-parser');

class MatrixParser {

    parse(rows) {

        // Oda satırlarını bul
        const roomParser = new MatrixRoomParser();
        const rooms = roomParser.findRoomRows(rows);

        // Dönemleri bul
        const periodParser = new MatrixPeriodParser();
        const periods = periodParser.findPeriods(rows);

        // Fiyatları bul
        const priceParser = new MatrixPriceParser();
        const prices = priceParser.findPrices(
            rows,
            rooms,
            periods
        );

        // Debug
        console.log('========== MATRIX PARSER ==========');

        console.log('Bulunan odalar:');
        rooms.forEach(room => {
            console.log(room.roomName);
        });

        console.log('===================================');

        console.log('Bulunan dönemler:');
        console.log(periods);

        console.log('Bulunan fiyatlar:');
        console.log(prices);

        return {
            rooms,
            periods,
            prices
        };
    }

}

module.exports = MatrixParser;