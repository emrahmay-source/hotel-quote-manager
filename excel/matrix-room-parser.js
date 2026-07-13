'use strict';

const { isEmpty } = require('./matrix-utils');

class MatrixRoomParser {

    findRoomRows(rows) {
        const roomRows = [];

        rows.forEach((row, rowIndex) => {

            if (!Array.isArray(row) || row.length === 0) {
                return;
            }

            const firstCell = String(row[0] || '').trim();

            if (isRoomName(firstCell)) {
                roomRows.push({
                    rowIndex,
                    roomName: firstCell,
                    row
                });
            }

        });

        return roomRows;
    }

}

function isRoomName(text) {

    if (isEmpty(text)) {
        return false;
    }

    const value = text.toUpperCase();

    return (
        value.includes('DBL') ||
        value.includes('SNG') ||
        value.includes('TRP') ||
        value.includes('FAM') ||
        value.includes('SUITE') ||
        value.includes('ROOM')
    );
}

module.exports = MatrixRoomParser;