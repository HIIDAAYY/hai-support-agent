import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

// TEMPORARY endpoint to reset admin password - REMOVE after use
export async function POST(request: Request) {
    try {
        const { secret } = await request.json();

        // Simple secret to prevent unauthorized access
        if (secret !== 'reset-admin-2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const passwordHash = await hash('Admin123!', 12);

        const admin = await prisma.adminUser.update({
            where: { username: 'admin' },
            data: { passwordHash, updatedAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            message: `Password reset for user: ${admin.username}`,
        });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        );
    }
}
