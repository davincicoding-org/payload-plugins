import { getAdminURL } from '@davincicoding/payload-plugin-kit';
import type { PayloadRequest, Plugin, TypedUser } from 'payload';
import { DEFAULT_HTML, DEFAULT_SUBJECT, INVITATION_PAGE_PATH } from './const';
import { acceptInviteEndpoint } from './endpoints/accept-invite';
import { hideAuthOnCreateField, joinedAtField } from './fields';
import { autoGeneratePassword } from './hooks/auto-generate-password';
import { setJoinedAt } from './hooks/set-joined-at';
import { validateUniqueEmail } from './hooks/validate-unique-email';

export { acceptInvite } from './utils/accept-invite';
export { getInviteData } from './utils/get-invite-data';

export type AcceptInvitationURLFn = (args: {
  token: string;
  user: TypedUser;
  req: PayloadRequest;
  defaultURL: string;
}) => string | Promise<string>;

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
}

export const invitationsPlugin =
  ({
    acceptInvitationURL,
    generateInvitationEmailHTML = DEFAULT_HTML,
    generateInvitationEmailSubject = DEFAULT_SUBJECT,
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
      req,
      token,
      user,
    }: {
      req: PayloadRequest;
      token: string;
      user: TypedUser;
    }) => {
      const defaultURL = `${getAdminURL({ req, path: INVITATION_PAGE_PATH })}?token=${token}`;

      if (typeof acceptInvitationURL === 'string') {
        const separator = acceptInvitationURL.includes('?') ? '&' : '?';
        return `${acceptInvitationURL}${separator}token=${token}`;
      }
      if (typeof acceptInvitationURL === 'function')
        return acceptInvitationURL({ token, user, req, defaultURL });
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
              req,
              token,
              user,
            });
            return generateInvitationEmailHTML({ req, invitationURL, user });
          },
          generateEmailSubject: async ({ req, token, user }) => {
            const invitationURL = await resolveInvitationURL({
              req,
              token,
              user,
            });
            return generateInvitationEmailSubject({ req, invitationURL, user });
          },
        },
      };

      collection.fields ??= [];

      collection.fields.unshift({
        name: '_email',
        label: ({ t }) => t('general:email'),
        type: 'email',
        required: true,
        virtual: true,
        admin: {
          disableListColumn: true,
          condition: (data, _siblingData, { user }) => !data.id && !!user,
        },
      });

      collection.fields.push(joinedAtField);
      collection.fields.push(hideAuthOnCreateField);

      collection.hooks ??= {};
      collection.hooks.beforeValidate ??= [];
      collection.hooks.beforeValidate.push(autoGeneratePassword);
      collection.hooks.beforeChange ??= [];
      collection.hooks.beforeChange.push(validateUniqueEmail);
      collection.hooks.beforeChange.push(setJoinedAt);
    }

    config.endpoints ??= [];
    config.endpoints.push(acceptInviteEndpoint);

    return config;
  };
