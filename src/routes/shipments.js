const router = require('express').Router();
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const parseId = require('../utils/parseId');
const { authenticate, authorize } = require('../middlewares/auth');

const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

router.patch('/:shipid', authenticate, authorize('ADMIN'), async (req, res) => {
    const { status } = req.body ?? {};
    if (!STATUSES.includes(status)) {
        throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
    }
    const shipment = await prisma.shipment.update({
        where: { shipid: parseId(req.params.shipid) },
        data: { status },
    });
    res.json(shipment);
});

module.exports = router;