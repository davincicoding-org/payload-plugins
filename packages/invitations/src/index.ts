import type { Plugin } from 'payload';
import type { InvitationsPluginConfig } from './types';

export const invitationsPlugin =
  (config: InvitationsPluginConfig): Plugin =>
  (payloadConfig) => {
    return payloadConfig;
  };
