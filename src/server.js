const env = require('./config/env');
const app = require('./app');
const prisma = require('./lib/prisma');

const server = app.listen(env.port, () => {
    console.log(`API running on port ${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));