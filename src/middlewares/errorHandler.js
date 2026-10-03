const HttpError = require('../utils/httpError');

module.exports = (err, req, res, next) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON body' });
    }
    // Lỗi Prisma thường gặp
    if (err.code === 'P2002') return res.status(409).json({ message: 'Duplicate value' });
    if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' });
    if (err.code === 'P2003') {
        return res.status(409).json({ message: 'Operation violates a related record constraint' });
    }

    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
};