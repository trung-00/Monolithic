const HttpError = require('./httpError');

module.exports = function parseId(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw new HttpError(400, 'Invalid id');
    }
    return n;
};