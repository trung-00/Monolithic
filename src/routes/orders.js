const router = require('express').Router();
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const parseId = require('../utils/parseId');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// Tạo đơn: { "items": [ { "pid": 1, "qty": 2 }, ... ] }
router.post('/', async (req, res) => {
    const { items } = req.body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
        throw new HttpError(400, 'items must be a non-empty array');
    }
    for (const it of items) {
        if (!Number.isInteger(it?.pid) || !Number.isInteger(it?.qty) || it.qty <= 0) {
            throw new HttpError(400, 'Each item needs integer pid and integer qty > 0');
        }
    }
    if (new Set(items.map((i) => i.pid)).size !== items.length) {
        throw new HttpError(400, 'Duplicate pid in items');
    }

    const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
            where: { pid: { in: items.map((i) => i.pid) } },
        });
        if (products.length !== items.length) {
            throw new HttpError(404, 'One or more products not found');
        }
        const priceMap = new Map(products.map((p) => [p.pid, p.price]));

        // Trừ kho có điều kiện, tránh bán quá số lượng khi nhiều người mua cùng lúc
        for (const it of items) {
            const result = await tx.product.updateMany({
                where: { pid: it.pid, quantity: { gte: it.qty } },
                data: { quantity: { decrement: it.qty } },
            });
            if (result.count === 0) {
                throw new HttpError(409, `Insufficient stock for product ${it.pid}`);
            }
        }

        return tx.order.create({
            data: {
                uid: req.user.uid,
                details: {
                    create: items.map((it) => ({
                        pid: it.pid,
                        qty: it.qty,
                        unitPrice: priceMap.get(it.pid),
                    })),
                },
                shipments: { create: { status: 'PENDING' } },
            },
            include: { details: true, shipments: true },
        });
    });

    res.status(201).json(order);
});

// USER thấy đơn của mình, ADMIN thấy tất cả
router.get('/', async (req, res) => {
    const where = req.user.role === 'ADMIN' ? {} : { uid: req.user.uid };
    res.json(
        await prisma.order.findMany({
            where,
            include: { details: true, shipments: true },
            orderBy: { oid: 'desc' },
        })
    );
});

router.get('/:oid', async (req, res) => {
    const order = await prisma.order.findUnique({
        where: { oid: parseId(req.params.oid) },
        include: { details: { include: { product: true } }, shipments: true },
    });
    if (!order) throw new HttpError(404, 'Order not found');
    if (req.user.role !== 'ADMIN' && order.uid !== req.user.uid) {
        throw new HttpError(403, 'Forbidden');
    }
    res.json(order);
});

module.exports = router;