import { getAdminURL } from '@davincicoding/payload-plugin-kit';
import type { Payload, PayloadRequest, Plugin, TypedUser } from 'payload';
import { formatAdminURL } from 'payload/shared';
import { DEFAULT_HTML, DEFAULT_SUBJECT, INVITATION_PAGE_PATH } from './const';
import { acceptInviteEndpoint } from './endpoints/accept-invite';
import { reinviteEndpoint } from './endpoints/reinvite';
import { verifyAndLoginEndpoint } from './endpoints/verify-and-login';
import {
  hideAuthOnCreateField,
  invitationFlowField,
  joinedAtField,
  verificationFlowField,
} from './fields';
import { createAutoGeneratePasswordHook } from './hooks/auto-generate-password';
import { disableVerificationEmail } from './hooks/disable-verification-email';
import { createSendInvitationEmailHook } from './hooks/send-invitation-email';
import { setJoinedAt } from './hooks/set-joined-at';
import { validateUniqueEmail } from './hooks/validate-unique-email';
import type {
  AcceptInvitationURLFn,
  EmailSenderOption,
  VerificationFlowConfig,
} from './types';
import { createSendInvitationEmail } from './utils/send-invitation-email';

export type {
  AcceptInvitationURLFn,
  EmailSender,
  EmailSenderOption,
  VerificationFlowConfig,
} from './types';
export { acceptInvite } from './utils/accept-invite';
export { getInviteData } from './utils/get-invite-data';
export type { SendInvitationEmailResult } from './utils/send-invitation-email';
export { sendInvitationEmail } from './utils/send-invitation-email';
export { verifyAndLogin } from './utils/verify-and-login';

export interface InvitationsPluginConfig {
  /**
   * Custom URL for the accept-invitation page.
   *
   * - String: appended with `?token=...` and used in invitation emails. The built-in admin view is not registered.
   * - Function: called with `{ token, user, req, defaultURL }` to generate the full URL. The built-in admin view is still registered.
   * - Not set: uses the default admin panel invitation page.
   */
  acceptInvitationURL?: string | AcceptInvitationURLFn;
  /**
   * Custom email sender for invitation emails.
   *
   * - Object: `{ email: 'noreply@acme.com', name: 'Acme Corp' }`
   * - Function: `async ({ req, user }) => ({ email, name })` for dynamic resolution (e.g., from a tenant document)
   *
   * Falls back to the Payload email adapter defaults when not set.
   */
  emailSender?: EmailSenderOption;
  /**
   * Customize the invitation email.
   */
  generateInvitationEmailHTML?: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  /**
   * Customize the invitation email subject.
   */
  generateInvitationEmailSubject?: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => Promise<string> | string;
  /**
   * Named verification flows for non-invite user creation paths.
   *
   * Each flow defines its own email sender, template, and verification URL.
   * The consumer triggers a flow by passing `_verificationFlow: '<name>'`
   * during `payload.create`.
   */
  verificationFlows?: Record<string, VerificationFlowConfig>;
}

export const invitationsPlugin =
  ({
    acceptInvitationURL,
    emailSender,
    generateInvitationEmailHTML = DEFAULT_HTML,
    generateInvitationEmailSubject = DEFAULT_SUBJECT,
    verificationFlows,
  }: InvitationsPluginConfig = {}): Plugin =>
  (config) => {
    if (!config.admin?.user) {
      console.warn(
        '[payload-invitations] You have not set the admin.user option in your Payload config, so this plugin will have no effect.',
      );
      return config;
    }

    if (!config.email) {
      console.warn(
        '[payload-invitations] You have not set up an email adapter in your Payload config, so this plugin will have no effect.',
      );
      return config;
    }

    const usersCollection = config.collections?.find(
      ({ slug }) => slug === config.admin?.user,
    );

    if (!usersCollection) {
      console.warn(
        `[payload-invitations] The collection specified in admin.user ${config.admin.user} does not exist, so this plugin will have no effect.`,
      );
      return config;
    }

    if (
      usersCollection.auth &&
      typeof usersCollection.auth === 'object' &&
      typeof usersCollection.auth.verify === 'object'
    ) {
      if (usersCollection.auth.verify.generateEmailHTML)
        console.warn(
          `[payload-invitations] Your users collection ("${usersCollection.slug}") sets "auth.verify.generateEmailHTML", this will be ignored. Please use "generateInvitationEmailHTML" in the pluign config instead.`,
        );
      if (usersCollection.auth.verify.generateEmailSubject)
        console.warn(
          `[payload-invitations] Your users collection ("${usersCollection.slug}") sets "auth.verify.generateEmailSubject", this will be ignored. Please use "generateInvitationEmailSubject" in the pluign config instead.`,
        );
    }

    if (typeof acceptInvitationURL !== 'string') {
      config.admin ??= {};
      config.admin.components ??= {};
      config.admin.components.views ??= {};
      config.admin.components.views.invitation = {
        Component: 'payload-invitations/rsc#InvitationPage',
        path: INVITATION_PAGE_PATH,
        exact: true,
      };
    }

    const resolveInvitationURL = async ({
      payload,
      req,
      token,
      user,
    }: {
      payload: Payload;
      req: PayloadRequest | undefined;
      token: string;
      user: TypedUser;
    }) => {
      if (typeof acceptInvitationURL === 'string') {
        const separator = acceptInvitationURL.includes('?') ? '&' : '?';
        return `${acceptInvitationURL}${separator}token=${token}`;
      }

      const serverURL =
        req != null
          ? getAdminURL({ req, path: INVITATION_PAGE_PATH })
          : formatAdminURL({
              adminRoute: payload.config.routes.admin,
              serverURL: payload.config.serverURL ?? '',
              path: INVITATION_PAGE_PATH,
            });
      const defaultURL = `${serverURL}?token=${token}`;

      if (typeof acceptInvitationURL === 'function')
        return acceptInvitationURL({
          token,
          user,
          req: req as PayloadRequest,
          defaultURL,
        });
      return defaultURL;
    };

    config.collections ??= [];

    for (const collection of config.collections) {
      if (collection.slug !== config.admin?.user) continue;

      collection.auth = {
        ...(typeof collection.auth === 'object' ? collection.auth : {}),
        verify: {
          generateEmailHTML: async ({ req, token, user }) => {
            const invitationURL = await resolveInvitationURL({
              payload: req.payload,
              req,
              token,
              user,
            });
            return generateInvitationEmailHTML({ req, invitationURL, user });
          },
          generateEmailSubject: async ({ req, token, user }) => {
            const invitationURL = await resolveInvitationURL({
              payload: req.payload,
              req,
              token,
              user,
            });
            return generateInvitationEmailSubject({ req, invitationURL, user });
          },
        },
      };

      collection.fields ??= [];

      collection.fields.push(joinedAtField);
      collection.fields.push(hideAuthOnCreateField);
      collection.fields.push(verificationFlowField);
      collection.fields.push(invitationFlowField);

      collection.hooks ??= {};
      collection.hooks.beforeValidate ??= [];
      collection.hooks.beforeValidate.push(
        createAutoGeneratePasswordHook({ verificationFlows }),
      );
      collection.hooks.beforeChange ??= [];
      collection.hooks.beforeChange.push(validateUniqueEmail);
      collection.hooks.beforeChange.push(setJoinedAt);

      const boundSendEmail = createSendInvitationEmail({
        emailSender,
        generateInvitationEmailHTML,
        generateInvitationEmailSubject,
        resolveInvitationURL,
        verificationFlows,
      });

      collection.hooks.beforeOperation ??= [];
      collection.hooks.beforeOperation.push(disableVerificationEmail);
      collection.hooks.afterChange ??= [];
      collection.hooks.afterChange.push(
        createSendInvitationEmailHook({ sendEmail: boundSendEmail }),
      );
    }

    config.endpoints ??= [];
    config.endpoints.push(acceptInviteEndpoint);
    config.endpoints.push(reinviteEndpoint);
    config.endpoints.push(verifyAndLoginEndpoint);

    return config;
  };
