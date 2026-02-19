import {
  createCollectionConfigFactory,
  resolveDocumentID,
} from '@davincicoding/payload-plugin-kit';
import type { GlobalConfig } from 'payload';
import { SETTINGS_SLUG } from './const';
import type { ResolvedPluginOptions } from './types';

export const Settings: GlobalConfig = {
  slug: SETTINGS_SLUG,
  admin: {
    group: 'Invoicing',
  },
  typescript: {
    interface: 'PluginSettings',
  },
  label: 'Settings',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'company',
          label: 'Company Information',
          fields: [
            {
              name: 'logo',
              type: 'text',
              admin: { description: 'Company logo for invoice header' },
            },

            {
              name: 'name',
              type: 'text',
              required: true,
              maxLength: 70,
            },
            {
              name: 'address',
              type: 'text',
              required: true,
              maxLength: 70,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'country',
                  type: 'text',
                  required: true,
                  admin: {
                    width: '40px',
                    description: '2-letters',
                  },
                },
                {
                  name: 'zip',
                  label: 'Postal Code',
                  type: 'text',
                  required: true,
                  defaultValue: '6312',
                  admin: {
                    width: '100px',
                  },
                },
                {
                  name: 'city',
                  type: 'text',
                  required: true,
                  admin: {},
                },
              ],
            },

            {
              name: 'website',
              type: 'text',
              required: true,
            },
            {
              name: 'uid',
              label: 'UID',
              type: 'text',
              required: true,
            },
          ],
        },

        {
          name: 'contact',
          label: 'Contact Person',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'email',
              type: 'email',
              required: true,
            },
            {
              name: 'phone',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'bank',
          label: 'Bank Connection',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'iban',
              label: 'IBAN',
              type: 'text',
              required: true,
            },
            {
              name: 'bic',
              label: 'BIC',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
  ],
};

// MARK: Collections

export const Clients = createCollectionConfigFactory({
  admin: {
    group: 'Invoicing',
    useAsTitle: 'name',
  },
  fields: [
    {
      type: 'group',
      label: 'Company',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'code',
              type: 'text',
              required: true,
              unique: true,
              admin: {
                width: '100px',
              },
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              maxLength: 70,
            },
          ],
        },

        {
          name: 'address',
          type: 'text',
          required: true,
          maxLength: 70,
        },

        {
          type: 'row',
          fields: [
            {
              name: 'country',
              type: 'text',
              required: true,
              defaultValue: 'CH',
              admin: {
                description: '2-letters',
                width: '40px',
              },
            },
            {
              name: 'zip',
              label: 'Postal Code',
              type: 'text',
              required: true,
              admin: {
                width: '100px',
              },
            },
            {
              name: 'city',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },

    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'salutation',
              type: 'select',
              options: ['mr', 'ms', 'miss', 'mx', 'dr', 'prof'],
              required: true,
              admin: {
                width: '100px',
              },
            },
            {
              name: 'firstname',
              type: 'text',
              required: true,
            },
            {
              name: 'lastname',
              type: 'text',
              required: true,
              defaultValue: 'Mustermann',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'formality',
              type: 'select',
              options: [
                { label: 'Formal', value: 'formal' },
                { label: 'Informal', value: 'informal' },
              ],
              defaultValue: 'formal',
              required: true,
              admin: {
                width: '140px',
              },
            },
            {
              name: 'language',
              type: 'select',
              options: [
                { label: 'German', value: 'de' },
                { label: 'French', value: 'fr' },
                { label: 'Italian', value: 'it' },
                { label: 'English', value: 'en' },
              ],
              defaultValue: 'de',
              required: true,
              admin: {
                width: '140px',
              },
            },
            {
              name: 'email',
              type: 'email',
              required: true,
            },
          ],
        },
      ],
    },
  ],
});

export const Services = createCollectionConfigFactory<
  ResolvedPluginOptions<'clientsCollectionSlug'>
>(({ clientsCollectionSlug }) => ({
  admin: {
    group: 'Invoicing',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'cost',
      type: 'number',
      required: true,
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: clientsCollectionSlug,
      required: true,
    },
    {
      name: 'recurrence',
      type: 'select',
      options: [
        { label: 'One-time', value: 'one-time' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ],
      required: true,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.YYYY' },
      },
    },
    {
      name: 'lastInvoicedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.YYYY' },
      },
    },
  ],
}));

export const Invoices = createCollectionConfigFactory<
  ResolvedPluginOptions<
    | 'invoicePdfsCollectionSlug'
    | 'clientsCollectionSlug'
    | 'servicesCollectionSlug'
  >
>(
  ({
    invoicePdfsCollectionSlug,
    clientsCollectionSlug,
    servicesCollectionSlug,
  }) => ({
    admin: {
      group: 'Invoicing',
      useAsTitle: 'invoiceNumber',
      defaultColumns: ['invoiceNumber', 'client', 'date', 'total', 'status'],
    },
    access: {
      create: () => false,
    },
    fields: [
      {
        name: 'invoiceNumber',
        type: 'text',
        required: true,
        unique: true,
      },
      {
        name: 'client',
        type: 'relationship',
        relationTo: clientsCollectionSlug,
        required: true,
      },
      {
        name: 'items',
        type: 'array',
        required: true,
        fields: [
          {
            name: 'service',
            type: 'relationship',
            relationTo: servicesCollectionSlug,
            required: true,
          },
          {
            name: 'cost',
            type: 'number',
            required: true,
          },
        ],
      },
      {
        name: 'total',
        type: 'number',
        required: true,
      },
      {
        name: 'date',
        type: 'date',
        required: true,
        admin: {
          date: { pickerAppearance: 'dayOnly' },
        },
      },
      {
        name: 'pdf',
        type: 'upload',
        relationTo: invoicePdfsCollectionSlug,
      },
      {
        name: 'status',
        type: 'select',
        options: [
          { label: 'Generated', value: 'generated' },
          { label: 'Sent', value: 'sent' },
          { label: 'Paid', value: 'paid' },
        ],
        required: true,
      },
      {
        name: 'sentAt',
        type: 'date',
        admin: {
          date: { pickerAppearance: 'dayAndTime' },
        },
      },
    ],
    hooks: {
      afterDelete: [
        async ({ doc, req }) => {
          if (!doc?.pdf) return;

          await req.payload.delete({
            collection: invoicePdfsCollectionSlug,
            id: resolveDocumentID(doc.pdf),
            req,
          });
        },
      ],
    },
  }),
);

export const InvoicePdfs = createCollectionConfigFactory({
  admin: {
    hidden: true,
  },
  upload: {
    mimeTypes: ['application/pdf'],
  },
  fields: [],
});
