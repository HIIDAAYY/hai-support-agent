import { z } from 'zod';

const CONVERSATION_STATUSES = ['ACTIVE', 'ENDED', 'REDIRECTED', 'ALL'] as const;

export const ConversationsListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(CONVERSATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ConversationsListQuery = z.infer<typeof ConversationsListQuerySchema>;
