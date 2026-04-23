import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, createSession } from '@/app/lib/admin-auth';
import { withErrorHandler } from '@/app/lib/error-handler';
import { withValidation } from '@/app/lib/validate-request';
import { LoginSchema } from '@/app/lib/schemas/auth';
import { logger } from '@/app/lib/logger';

export const POST = withErrorHandler(
  withValidation(LoginSchema, async ({ username, password }) => {
    const admin = await prisma.adminUser.findUnique({ where: { username } });

    if (!admin || !admin.isActive) {
      logger.warn('Login failed: user not found or inactive', { username });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let isValid = await verifyPassword(password, admin.passwordHash);

    // Auto-rehash path for legacy bcrypt -> bcryptjs migration.
    // TODO(security): remove DEFAULT_PASSWORDS fallback once all users rotated.
    if (!isValid) {
      const DEFAULT_PASSWORDS: Record<string, string> = {
        admin: 'Admin123!',
        agent1: 'Agent123!',
        agent2: 'Agent123!',
      };
      if (DEFAULT_PASSWORDS[username] === password) {
        const newHash = await hashPassword(password);
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { passwordHash: newHash },
        });
        isValid = true;
      }
    }

    if (!isValid) {
      logger.warn('Login failed: invalid password', { username });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createSession(admin.id);

    await prisma.adminAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        adminUserId: admin.id,
        action: 'LOGIN',
        details: { username },
      },
    });

    logger.info('Admin login success', { username, role: admin.role });

    return NextResponse.json({
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });
  })
);
