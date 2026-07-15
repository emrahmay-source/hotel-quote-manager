'use strict';

const { createParser } = require('./parser-factory');

function parseExcel(rows) {

    const parser = createParser(rows);

    return parser.parse(rows);

}

module.exports = {
    parseExcel
};