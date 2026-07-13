const XLSX = require('xlsx');

function parse(buffer, options = {}) {

    const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true
    });

    const sheetNames = workbook.SheetNames;

    if (!sheetNames.length) {
        throw new Error('Excel dosyasında sayfa bulunamadı.');
    }

    const selectedSheet = options.sheet || sheetNames[0];

    const sheet = workbook.Sheets[selectedSheet];

    if (!sheet) {
        throw new Error(`"${selectedSheet}" isimli sheet bulunamadı.`);
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: ''
    });

    if (!jsonData.length) {
        return {
            sheetNames,
            selectedSheet,
            headers: [],
            data: []
        };
    }

    const headers = jsonData[0].map(value =>
        value != null ? String(value).trim() : ''
    );

    const data = jsonData
        .slice(1)
        .filter(row =>
            row.some(cell => cell !== '' && cell != null)
        );

    return {
        sheetNames,
        selectedSheet,
        headers,
        data
    };
}

module.exports = {
    parse
};