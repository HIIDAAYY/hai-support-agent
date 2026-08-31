import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin data...');

    const defaultAdminPass = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const defaultAgentPass = process.env.INITIAL_AGENT_PASSWORD || crypto.randomBytes(16).toString('hex');

    const passwordHash = await hash(defaultAdminPass, 12);
    const agentPasswordHash = await hash(defaultAgentPass, 12);

    // Create Super Admin (Do NOT overwrite passwordHash on update!)
    const admin = await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: { updatedAt: new Date() },
        create: {
            id: 'admin-1',
            username: 'admin',
            passwordHash,
            name: 'Super Admin',
            email: 'admin@example.com',
            role: 'SUPER_ADMIN',
            updatedAt: new Date(),
        },
    });

    // Create Agents (Do NOT overwrite passwordHash on update!)
    const agent1 = await prisma.adminUser.upsert({
        where: { username: 'agent1' },
        update: { updatedAt: new Date() },
        create: {
            id: 'agent-1',
            username: 'agent1',
            passwordHash: agentPasswordHash,
            name: 'Agent One',
            email: 'agent1@example.com',
            role: 'ADMIN',
            updatedAt: new Date(),
        },
    });

    const agent2 = await prisma.adminUser.upsert({
        where: { username: 'agent2' },
        update: { updatedAt: new Date() },
        create: {
            id: 'agent-2',
            username: 'agent2',
            passwordHash: agentPasswordHash,
            name: 'Agent Two',
            email: 'agent2@example.com',
            role: 'ADMIN',
            updatedAt: new Date(),
        },
    });

    console.log('Created/verified admin users:', { adminId: admin.id, agent1Id: agent1.id, agent2Id: agent2.id });

    // Check if we have customers
    let customer = await prisma.customer.findFirst();
    if (!customer) {
        customer = await prisma.customer.create({
            data: {
                phoneNumber: '6281234567890',
                name: 'John Doe',
            }
        });
    }

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
