
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Enabling vector extension...');
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('Vector extension enabled successfully.');
    } catch (error) {
        console.error('Error enabling vector extension:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
