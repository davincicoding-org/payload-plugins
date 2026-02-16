import { findFields, getAdminURL } from '@repo/common';
import type { PayloadRequest, Plugin } from 'payload';
import { DEFAULT_HTML, DEFAULT_SUBJECT, INVITATION_PAGE_PATH } from './const';
import { acceptInviteEndpoint } from './endpoints/accept-invite';
import { hideAuthOnCreateField, joinedAtField } from './fields';
import { autoGeneratePassword } from './hooks/auto-generate-password';
import { validateUniqueEmail } from './hooks/validate-unique-email';
import type { User } from './payload-types';

export interface InvitationsPluginConfig {
  /**
   * Customize the invitation email.
   */
  generateInvitationEmailHTML?: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: User;
  }) => string | Promise<string>;
  /**
   * Customize the invitation email subject.
   */
  generateInvitationEmailSubject?: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: User;
  }) => Promise<string> | string;
}

export const invitationsPlugin =
  ({
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

    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.views ??= {};
    config.admin.components.views.invitation = {
      Component: 'payload-invitations/rsc#InvitationPage',
      path: INVITATION_PAGE_PATH,
      exact: true,
    };

    config.collections ??= [];

    for (const collection of config.collections) {
      if (collection.slug !== config.admin?.user) continue;

      collection.auth = {
        ...(typeof collection.auth === 'object' ? collection.auth : {}),
        verify: {
          generateEmailHTML: ({ req, token, user }) =>
            generateInvitationEmailHTML({
              req,
              invitationURL: `${getAdminURL({ req, path: INVITATION_PAGE_PATH })}?token=${token}`,
              user,
            }),
          generateEmailSubject: ({ req, token, user }) =>
            generateInvitationEmailSubject({
              req,
              invitationURL: `${getAdminURL({ req, path: INVITATION_PAGE_PATH })}?token=${token}`,
              user,
            }),
        },
      };

      collection.fields ??= [];

      const [emailField] = findFields(
        collection.fields,
        (field) => field.type === 'email',
      ).filter((field) => field.name === 'email');

      if (emailField) {
        emailField.name = '_email';
        emailField.label = ({ t }) => t('general:email');
        emailField.required = true;
        emailField.virtual = true;
        emailField.admin ??= {};
        emailField.admin = {
          ...emailField.admin,
          disableListColumn: true,
          condition: (data) => !data.id,
        };
      } else {
        collection.fields.unshift({
          name: '_email',
          label: ({ t }) => t('general:email'),
          type: 'email',
          required: true,
          virtual: true,
          admin: {
            disableListColumn: true,
            condition: (data) => !data.id,
          },
        });
      }

      collection.fields.push(joinedAtField);
      collection.fields.push(hideAuthOnCreateField);

      collection.hooks ??= {};
      collection.hooks.beforeValidate ??= [];
      collection.hooks.beforeValidate.push(autoGeneratePassword);
      collection.hooks.beforeChange ??= [];
      collection.hooks.beforeChange.push(validateUniqueEmail);
    }

    config.endpoints ??= [];
    config.endpoints.push(acceptInviteEndpoint);

    return config;
  };
