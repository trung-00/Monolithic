const router = require('express').Router();
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const parseId = require('../utils/parseId');
const { authenticate, authorize } = require('../middlewares/auth');

function buildData(body, partial = false) {
    const { pname, price, quantity } = body ?? {};
    const data = {};

    if (!partial || pname !== undefined) {
        if (typeof pname !== 'string' || !pname.trim() || pname.length > 100) {
            throw new HttpError(400, 'pname is required (max 100 chars)');
        }
        data.pname = pname.trim();
    }
    if (!partial || price !== undefined) {
        if (typeof price !== 'number' || price < 0 || price > 99999999.99) {
            throw new HttpError(400, 'price must be a number between 0 and 99999999.99');
        }
        data.price = price;
    }
    if (!partial || quantity !== undefined) {
        if (!Number.isInteger(quantity) || quantity < 0) {
            throw new HttpError(400, 'quantity must be a non-negative integer');
        }
        data.quantity = quantity;
    }
    if (partial && Object.keys(data).length === 0) {
        throw new HttpError(400, 'No valid fields to update');
    }
    return data;
}

// Công khai
router.get('/', async (req, res) => {
    res.json(await prisma.product.findMany({ orderBy: { pid: 'asc' } }));
});

router.get('/:pid', async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { pid: parseId(req.params.pid) },
    });
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
});

// Chỉ ADMIN
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
    const product = await prisma.product.create({ data: buildData(req.body) });
    res.status(201).json(product);
});

router.put('/:pid', authenticate, authorize('ADMIN'), async (req, res) => {
    const product = await prisma.product.update({
        where: { pid: parseId(req.params.pid) },
        data: buildData(req.body, true),
    });
    res.json(product);
});

router.delete('/:pid', authenticate, authorize('ADMIN'), async (req, res) => {
    await prisma.product.delete({ where: { pid: parseId(req.params.pid) } });
    res.status(204).end();
});

module.exports = router;