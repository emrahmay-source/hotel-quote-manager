const standardParser = require('./standard');

function parse(buffer, options = {}) {
    return standardParser.parse(buffer, options);
}

module.exports = {
    parse
};