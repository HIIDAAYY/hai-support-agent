import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// Load .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

if (!process.env.PRISMA_DATABASE_URL) {
    process.env.PRISMA_DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
}

const prisma = new PrismaClient();

async function main() {
    const username = process.argv[2];
    const newPassword = process.argv[3];

    if (!username || !newPassword) {
        console.log('Usage: npx tsx scripts/change-password.ts <username> <newPassword>');
        console.log('Example: npx tsx scripts/change-password.ts admin PasswordSuperAman2026!');
        process.exit(1);
    }

    if (!process.env.PRISMA_DATABASE_URL) {
        console.error('❌ Error: Database URL environment variable (PRISMA_DATABASE_URL or DATABASE_URL) is not set in .env or .env.local.');
        process.exit(1);
    }

    const passwordHash = await hash(newPassword, 12);

    const user = await prisma.adminUser.update({
        where: { username },
        data: { passwordHash, updatedAt: new Date() },
    });

    console.log(`✅ Successfully updated password for user "${user.username}"!`);
}

main()
    .catch((e) => {
        console.error('❌ Error updating password:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
