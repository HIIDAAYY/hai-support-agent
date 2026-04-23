import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { logger } from './logger';

type Handler<T, Ctx> = (data: T, req: Request, ctx: Ctx) => Promise<Response>;

function badRequest(message: string, issues?: unknown) {
  return NextResponse.json(
    { error: message, issues },
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

export function withValidation<T, Ctx = unknown>(
  schema: ZodSchema<T>,
  handler: Handler<T, Ctx>
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logger.warn('Invalid JSON body', { url: req.url, method: req.method });
      return badRequest('Invalid JSON body');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Request body validation failed', {
        url: req.url,
        method: req.method,
        issues: parsed.error.issues,
      });
      return badRequest('Invalid request body', parsed.error.issues);
    }

    return handler(parsed.data, req, ctx);
  };
}

export function withQueryValidation<T, Ctx = unknown>(
  schema: ZodSchema<T>,
  handler: Handler<T, Ctx>
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    const { searchParams } = new URL(req.url);
    const raw: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      raw[k] = v;
    });

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      logger.warn('Query validation failed', {
        url: req.url,
        method: req.method,
        issues: parsed.error.issues,
      });
      return badRequest('Invalid query parameters', parsed.error.issues);
    }

    return handler(parsed.data, req, ctx);
  };
}

export { ZodError };
