import type { Field } from 'payload';

export const joinedAtField: Field = {
  name: 'joinedAt',
  type: 'date',
  admin: {
    readOnly: true,
    date: {
      displayFormat: 'PPp',
    },
    condition: (data) => Boolean(data?.id),
  },
};

export const hideAuthOnCreateField: Field = {
  name: '_hideAuthOnCreate',
  type: 'ui',
  admin: {
    components: {
      Field: {
        path: 'payload-invitations/client#HideAuthOnCreate',
      },
    },
  },
};
