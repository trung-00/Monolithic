require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Roles
    const adminRole = await prisma.role.upsert({
        where: { rolename: 'ADMIN' }, update: {}, create: { rolename: 'ADMIN' },
    });
    await prisma.role.upsert({
        where: { rolename: 'normal' }, update: {}, create: { rolename: 'normal' },
    });

    // Memberships (Bronze là hạng mặc định khi đăng ký, score 10)
    const tiers = [
        { mname: 'Bronze', score: 10 },
        { mname: 'Silver', score: 100 },
        { mname: 'Gold', score: 500 },
    ];
    for (const t of tiers) {
        await prisma.membership.upsert({
            where: { mname: t.mname }, update: {}, create: t,
        });
    }
    const bronze = await prisma.membership.findUnique({ where: { mname: 'Bronze' } });

    // Admin
    const username = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) throw new Error('ADMIN_PASSWORD is required for seeding');

    await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
            username,
            fullname: 'Administrator',
            password: await bcrypt.hash(adminPassword, 10),
            roleid: adminRole.roleid,
            mid: bronze.mid,
        },
    });

    // Sản phẩm mẫu
    if ((await prisma.product.count()) === 0) {
        await prisma.product.createMany({
            data: [
                { pname: 'Laptop Demo 14"', price: '15990000.00', quantity: 20 },
                { pname: 'Chuột không dây', price: '250000.00', quantity: 100 },
                { pname: 'Bàn phím cơ', price: '990000.00', quantity: 50 },
            ],
        });
    }
}

main()
    .then(() => console.log('Seed completed'))
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());