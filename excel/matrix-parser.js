'use strict';

const MatrixRoomParser = require('./matrix-room-parser');

class MatrixParser {

    parse(rows) {

        const roomParser = new MatrixRoomParser();

        const rooms = roomParser.findRoomRows(rows);

        console.log('========== MATRIX PARSER ==========');
        console.log('Bulunan odalar:');

        rooms.forEach(room => {
            console.log(room.roomName);
        });

        console.log('===================================');

        return {
            rooms,
            periods: [],
            prices: []
        };
    }

}

module.exports = MatrixParser;