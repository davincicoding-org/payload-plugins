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

export const verificationFlowField: Field = {
  name: '_verificationFlow',
  type: 'text',
  access: { read: () => false, update: () => false },
  admin: { hidden: true, disableListColumn: true },
  hooks: {
    beforeChange: [() => undefined],
  },
  virtual: true,
};

export const hideAuthOnCreateField: Field = {
  name: '_hideAuthOnCreate',
  type: 'ui',
  admin: {
    disableListColumn: true,
    components: {
      Field: {
        path: 'payload-invitations/client#HideAuthOnCreate',
      },
    },
  },
};
