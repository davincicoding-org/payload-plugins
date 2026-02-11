import { z } from 'zod';
import type { InvitationsPluginConfig } from '.';

export type ResolvedPluginOptions<
  K extends keyof InvitationsPluginConfig = keyof InvitationsPluginConfig,
> = Pick<Required<InvitationsPluginConfig>, K>;

export const reinviteSchema = z.object({
  userId: z.union([z.string(), z.number()]),
});

export const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string(),
});

export type ReinviteInput = z.infer<typeof reinviteSchema>;
