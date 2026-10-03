const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/httpError');

function authenticate(req, res, next) {
    const [type, token] = (req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) {
        throw new HttpError(401, 'Missing or malformed Authorization header');
    }
    try {
        const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
        req.user = { uid: payload.uid, role: payload.role };
        next();
    } catch {
        throw new HttpError(401, 'Invalid or expired token');
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new HttpError(403, 'Forbidden');
        }
        next();
    };
}

module.exports = { authenticate, authorize };