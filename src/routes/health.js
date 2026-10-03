const router = require('express').Router();
const prisma = require('../lib/prisma');

router.get('/', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            db: 'up',
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({ status: 'error', db: 'down' });
    }
});

module.exports = router;