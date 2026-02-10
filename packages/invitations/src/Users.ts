import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';
import type { User } from '@/payload-types';

const inviteNewUserHook: CollectionAfterChangeHook<User> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return;

  const token = await req.payload.forgotPassword({
    req,
    collection: 'users',
    data: {
      email: doc.email,
    },
    disableEmail: true,
  });

  const resetURL = `${req.payload.getAdminURL()}/reset/${token}`;

  await req.payload.sendEmail({
    to: doc.email,
    subject: 'Invitation to join Endstation',
    html: `
    <p>You have been invited to join the team.</p>
    <p>Please click the link below to accept the invitation: <a href="${resetURL}">Accept invitation</a></p>
    `,
  });
};

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: ({ req }) => req.user !== null,
    create: ({ req }) => req.user?.capabilities?.manageUsers ?? false,
    update: ({ req }) => req.user?.capabilities?.manageUsers ?? false,
    delete: ({ req }) => req.user?.capabilities?.manageUsers ?? false,
  },

  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'capabilities',
      type: 'group',
      admin: {
        position: 'sidebar',
        condition: (_data, _siblingData, { user }) =>
          user?.capabilities?.manageCapabilities ?? false,
      },
      fields: [],
    },
  ],
  hooks: {
    afterChange: [inviteNewUserHook],
  },
};
