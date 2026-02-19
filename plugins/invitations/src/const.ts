import { defineProcedure } from '@repo/common';
import { acceptInviteSchema, reinviteSchema } from './types';

export const ENDPOINTS = {
  reinvite: defineProcedure({
    path: '/invitations-plugin/reinvite',
    method: 'post',
    input: reinviteSchema,
  }).returns<{ success: true }>(),
  acceptInvite: defineProcedure({
    path: '/invitations-plugin/accept-invite',
    method: 'post',
    input: acceptInviteSchema,
  }).returns<{ success: true }>(),
};

export const INVITATION_PAGE_PATH = '/invitation';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_SUBJECT = () => 'You have been invited';

export const DEFAULT_HTML = ({ invitationURL }: { invitationURL: string }) =>
  `<!DOCTYPE html>
<html>
<body>
  <h1>You have been invited</h1>
  <p>Click the link below to accept your invitation:</p>
  <a href="${invitationURL}">Accept Invitation</a>
</body>
</html>`;
