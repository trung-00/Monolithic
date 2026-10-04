const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { authenticate } = require('../middlewares/auth');

router.post('/register', async (req, res) => {
    const { username, fullname, password } = req.body ?? {};

    if (![username, fullname, password].every((v) => typeof v === 'string' && v.trim())) {
        throw new HttpError(400, 'username, fullname and password are required');
    }
    if (username.length > 50 || fullname.length > 100) {
        throw new HttpError(400, 'username (max 50) or fullname (max 100) is too long');
    }
    if (password.length < 8 || password.length > 72) {
        throw new HttpError(400, 'password must be 8-72 characters');
    }

    const [role, membership] = await Promise.all([
        prisma.role.findUnique({ where: { rolename: 'USER' } }),
        prisma.membership.findUnique({ where: { mname: 'Bronze' } }),
    ]);
    if (!role || !membership) {
        throw new HttpError(500, 'Seed data missing. Run: npm run db:seed');
    }

    const user = await prisma.user.create({
        data: {
            username: username.trim(),
            fullname: fullname.trim(),
            password: await bcrypt.hash(password, env.saltRounds),
            roleid: role.roleid,
            mid: membership.mid,
        },
        select: { uid: true, username: true, fullname: true },
    });

    res.status(201).json(user);
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        throw new HttpError(400, 'username and password are required');
    }

    const user = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
    });
    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) throw new HttpError(401, 'Invalid username or password');

    const accessToken = jwt.sign(
        { uid: user.uid, role: user.role.rolename },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn }
    );
    res.json({ accessToken, tokenType: 'Bearer', expiresIn: env.jwtExpiresIn });
});

router.get('/me', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { uid: req.user.uid },
        select: {
            uid: true, username: true, fullname: true,
            role: true, membership: true,
        },
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json(user);
});

router.patch('/password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        throw new HttpError(400, 'currentPassword and newPassword are required');
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
        throw new HttpError(400, 'newPassword must be 8-72 characters');
    }

    const user = await prisma.user.findUnique({ where: { uid: req.user.uid } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new HttpError(401, 'Current password is incorrect');
    }

    await prisma.user.update({
        where: { uid: user.uid },
        data: { password: await bcrypt.hash(newPassword, env.saltRounds) },
    });
    res.status(204).end();
});

module.exports = router;