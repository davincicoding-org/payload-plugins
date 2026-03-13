import crypto from 'node:crypto';
import type { CollectionBeforeValidateHook } from 'payload';
import type { User } from '@/payload-types';
import type { VerificationFlowConfig } from '../types';
import { resolveCreateFlow } from '../utils/resolve-create-flow';

export function createAutoGeneratePasswordHook({
  verificationFlows,
}: {
  verificationFlows: Record<string, VerificationFlowConfig> | undefined;
}): CollectionBeforeValidateHook<User> {
  return ({ operation, data, req }) => {
    if (operation !== 'create' || !data) return data;

    const flow = resolveCreateFlow({ data, verificationFlows });

    // Stash on req.context so downstream hooks (afterChange) can read it.
    // _verificationFlow is a virtual field stripped before persistence,
    // so afterChange hooks cannot resolve the flow from the doc.
    req.context.createFlow = flow;

    if (flow.type !== 'admin-invite') return data;

    const password = crypto.randomBytes(32).toString('hex');

    return {
      ...data,
      password,
      'confirm-password': password,
    };
  };
}
