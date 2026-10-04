const router = require('express').Router();
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const parseId = require('../utils/parseId');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('ADMIN'));

const publicFields = {
    uid: true,
    username: true,
    fullname: true,
    role: true,
    membership: true,
};

router.get('/', async (req, res) => {
    res.json(
        await prisma.user.findMany({ select: publicFields, orderBy: { uid: 'asc' } })
    );
});

router.get('/:uid', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { uid: parseId(req.params.uid) },
        select: publicFields,
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json(user);
});

module.exports = router;