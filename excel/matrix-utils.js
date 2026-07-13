'use strict';

function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
    );
}

module.exports = {
    isEmpty
};