'use strict';

class StandardParser {

    parse(rows) {

        if (!Array.isArray(rows) || rows.length === 0) {
            return {
                format: 'standard',
                headers: [],
                rooms: []
            };
        }

        const headers = rows[0].map(cell =>
            cell != null ? String(cell).trim() : ''
        );

        const data = rows
            .slice(1)
            .filter(row =>
                row.some(cell => cell !== '' && cell != null)
            );

        return {
            format: 'standard',
            headers,
            rooms: data
        };

    }

}

module.exports = StandardParser;