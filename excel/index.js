const { createParser } = require('./parser-factory');

function parseExcel(workbook) {
    const parser = createParser(workbook);
    return parser.parse(workbook);
}

module.exports = {
    parseExcel
};