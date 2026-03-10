import { APIError } from 'payload';
import type { CreateFlow, VerificationFlowConfig } from '../types';

export function resolveCreateFlow({
  data,
  verificationFlows,
}: {
  data: Record<string, unknown>;
  verificationFlows: Record<string, VerificationFlowConfig> | undefined;
}): CreateFlow {
  const flowName = data._verificationFlow;

  if (typeof flowName === 'string') {
    const config = verificationFlows?.[flowName];
    if (!config) {
      throw new APIError(
        `Unknown verification flow: "${flowName}". ` +
          `Configured flows: ${verificationFlows ? Object.keys(verificationFlows).join(', ') : 'none'}`,
      );
    }
    return { type: 'verification-flow', name: flowName, config };
  }

  if (data._email) {
    return { type: 'admin-invite' };
  }

  return { type: 'direct-create' };
}
