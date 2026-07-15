'use strict';

class StructureDetector {

    detect(rows) {

        if (!Array.isArray(rows) || rows.length === 0) {
            return {
                format: 'unknown'
            };
        }

        const sample = rows.slice(0, 40);

        // ==========================
        // PERIOD TABLOSU KONTROLÜ
        // ==========================

        let periodCount = 0;

        for (const row of sample) {

            for (const cell of row) {

                const value = String(cell || '').toUpperCase();

                if (
                    value.includes('DÖNEM') ||
                    value.includes('DONEM') ||
                    value.includes('PERIOD')
                ) {
                    periodCount++;
                }

            }

        }

        if (periodCount >= 2) {

            return {
                format: 'matrix'
            };

        }

        // ==========================
        // MATRIX KONTROLÜ
        // ==========================

        const roomKeywords = [
            'DBL',
            'SNG',
            'TRP',
            'STD',
            'SUPERIOR',
            'DELUXE',
            'FAMILY',
            'SUITE',
            'ROOM'
        ];

        let roomRow = null;
        let dateRow = null;
        let nightRow = null;

        for (let r = 0; r < sample.length; r++) {

            const row = sample[r];

            let roomCount = 0;
            let dateCount = 0;

            for (const cell of row) {

                const value = String(cell || '').toUpperCase();

                if (
                    roomKeywords.some(k => value.includes(k))
                ) {
                    roomCount++;
                }

                if (
                    cell instanceof Date ||
                    /\d{2}[./-]\d{2}/.test(value) ||
                    /\d{2}[./-]\d{2}[./-]\d{4}/.test(value)
                ) {
                    dateCount++;
                }

                if (
                    value.includes('GECE') ||
                    value.includes('NIGHT')
                ) {
                    nightRow = r;
                }

            }

            if (roomCount >= 2 && roomRow === null) {
                roomRow = r;
            }

            if (dateCount >= 2 && dateRow === null) {
                dateRow = r;
            }

        }

        if (roomRow !== null && dateRow !== null) {

            return {

                format: 'matrix',

                headerRow: Math.max(0, dateRow - 1),

                dateRow,

                nightRow,

                roomStartRow: roomRow,

                roomColumn: 0

            };

        }

        return {

            format: 'standard'

        };

    }

}

module.exports = StructureDetector;