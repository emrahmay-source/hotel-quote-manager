'use strict';

const StructureDetector = require('./structure-detector');
const MatrixParser = require('./matrix-parser');
const StandardParser = require('./standard-parser');

function createParser(rows) {

    const detector = new StructureDetector();

    const structure = detector.detect(rows);

    console.log('[Structure]', structure);

    switch (structure.format) {

        case 'matrix':
            return new MatrixParser();

        default:
            return new StandardParser();

    }

}

module.exports = {
    createParser
};