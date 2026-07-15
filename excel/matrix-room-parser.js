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

            if (!isRoomName(firstCell)) {
                return;
            }

            roomRows.push({
                row: rowIndex,
                rowIndex,
                roomName: firstCell,
                features: [],
                rowData: row
            });

        });

        return roomRows;

    }

}

function isRoomName(text) {

    if (isEmpty(text)) {
        return false;
    }

    const value = String(text).trim();

    if (value.length < 3) {
        return false;
    }

    const upper = value.toUpperCase();

    // Açıklama satırları
    const invalidWords = [
        'BEBEK',
        'ÇOCUK',
        'MAXIMUM',
        'MINIMUM',
        'KAPASİTE',
        'KONAKLAMA',
        'İNDİRİM',
        'INDIRIM',
        'AÇIKLAMA',
        'ACIKLAMA',
        'NOT',
        'PERIOD',
        'TARİH',
        'TARIH',
        'GEÇERLİLİK',
        'GECERLILIK',
        'PERİYOT',
        'PERIYOT',
        'FİYAT LİSTESİ',
        'FIYAT LISTESI',

        // YENİ
        'MARKET',
        'CIS MARKET',
        'DOMESTIC',
        'INTERNATIONAL',
        'SEASON',
        'SEZON',
        'DÖNEM',
        'DONEM'
    ];

    if (invalidWords.some(word => upper.includes(word))) {
        return false;
    }

    // Sadece yıl yazan satırlar
    if (/^20\d\d/.test(value)) {
        return false;
    }

    // Tamamen sayıysa oda değildir
    if (/^[0-9.,]+$/.test(value)) {
        return false;
    }

    // Gerçek oda isimlerinde bulunabilecek anahtar kelimeler
    const roomKeywords = [
        'DBL',
        'SNG',
        'TRP',
        'QUAD',
        'FAMILY',
        'SUITE',
        'ROOM',
        'STD',
        'SUPERIOR',
        'DELUXE',
        'ECONOMY',
        'BUNK',
        'VILLA',
        'KING',
        'QUEEN'
    ];

    return roomKeywords.some(k => upper.includes(k));

}

module.exports = MatrixRoomParser;