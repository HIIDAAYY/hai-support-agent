import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/app/lib/error-handler';
import { withValidation } from '@/app/lib/validate-request';
import { logger } from '@/app/lib/logger';
import { errorMonitor } from '@/app/lib/error-monitor';

const ErrorReportSchema = z.object({
  scope: z.string().max(50),
  message: z.string().max(2000),
  digest: z.string().max(200).optional(),
  stack: z.string().max(8000).optional(),
});

export const POST = withErrorHandler(
  withValidation(ErrorReportSchema, async (data, req) => {
    logger.error('Client-side error reported', undefined, {
      scope: data.scope,
      message: data.message,
      digest: data.digest,
      ua: req.headers.get('user-agent') ?? undefined,
    });

    const clientError = new Error(data.message);
    if (data.stack) clientError.stack = data.stack;
    errorMonitor
      .alert({
        message: `Client error (${data.scope}): ${data.message}`,
        error: clientError,
        context: { digest: data.digest, stack: data.stack },
        severity: 'medium',
      })
      .catch(() => {});

    return NextResponse.json({ ok: true });
  })
);
