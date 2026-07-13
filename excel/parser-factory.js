const StandardParser = require('./standard-parser');

function createParser(workbook) {
    // Şimdilik her zaman standart parser kullan.
    // İleride burada Matrix Parser seçilecek.
    return new StandardParser();
}

module.exports = {
    createParser
};