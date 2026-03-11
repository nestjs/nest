import { z } from 'zod';

export const PingOutputSchema = z.literal('pong');

export const WhoamiOutputSchema = z.object({
  requestId: z.string(),
});

export const UptimeOutputSchema = z.object({
  uptime: z.number(),
  timestamp: z.string(),
});

export const TickInputSchema = z.object({
  count: z.number().int().positive().max(10).optional(),
});

export const TickEventSchema = z.object({
  tick: z.number().int().positive(),
  requestId: z.string(),
});
