const router = require('express').Router();
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const parseId = require('../utils/parseId');
const { authenticate, authorize } = require('../middlewares/auth');

// Công khai: xem các hạng thành viên
router.get('/', async (req, res) => {
    res.json(await prisma.membership.findMany({ orderBy: { score: 'asc' } }));
});

// ADMIN: tạo hạng
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
    const { mname, score } = req.body ?? {};
    if (typeof mname !== 'string' || !mname.trim() || mname.length > 50) {
        throw new HttpError(400, 'mname is required (max 50 chars)');
    }
    if (!Number.isInteger(score) || score < 0) {
        throw new HttpError(400, 'score must be a non-negative integer');
    }
    res.status(201).json(
        await prisma.membership.create({ data: { mname: mname.trim(), score } })
    );
});

// ADMIN: sửa hạng
router.put('/:mid', authenticate, authorize('ADMIN'), async (req, res) => {
    const { mname, score } = req.body ?? {};
    const data = {};
    if (mname !== undefined) {
        if (typeof mname !== 'string' || !mname.trim() || mname.length > 50) {
            throw new HttpError(400, 'invalid mname');
        }
        data.mname = mname.trim();
    }
    if (score !== undefined) {
        if (!Number.isInteger(score) || score < 0) {
            throw new HttpError(400, 'invalid score');
        }
        data.score = score;
    }
    if (Object.keys(data).length === 0) throw new HttpError(400, 'No valid fields to update');

    res.json(await prisma.membership.update({
        where: { mid: parseId(req.params.mid) }, data,
    }));
});

// ADMIN: đổi hạng cho user
router.patch('/users/:uid', authenticate, authorize('ADMIN'), async (req, res) => {
    const mid = req.body?.mid;
    if (!Number.isInteger(mid)) throw new HttpError(400, 'mid must be an integer');
    const user = await prisma.user.update({
        where: { uid: parseId(req.params.uid) },
        data: { mid },
        select: { uid: true, username: true, membership: true },
    });
    res.json(user);
});

module.exports = router;