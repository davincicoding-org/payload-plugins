import type { CollectionBeforeOperationHook } from 'payload';

export const disableVerificationEmail: CollectionBeforeOperationHook = (
  arg,
) => {
  if (arg.operation !== 'create') return;
  return { ...arg.args, disableVerificationEmail: true };
};
