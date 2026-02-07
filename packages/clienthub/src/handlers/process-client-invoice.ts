import dayjs from 'dayjs';

import type { File, PayloadRequest } from 'payload';
import type { Client, Invoice, PluginSettings, Service } from '@/payload-types';
import type { ResolvedPluginOptions } from '@/types';
import { generateInvoicePdf } from '../templates/invoice-pdf';
import {
  formatGreeting,
  getInvoiceEmailStrings,
  getInvoicePdfLabels,
} from '../translations';
import { getAuthentication } from '../utils';

export const processClientInvoice = async (
  req: PayloadRequest,
  {
    client,
    services,
    settings,
  }: {
    client: Client;
    services: Service[];
    settings: PluginSettings;
  },
  options: ResolvedPluginOptions<'onError' | 'cronSecret'>,
): Promise<{
  client: string;
  invoiceNumber: string;
  error?: string;
} | null> => {
  const now = dayjs();
  const overrideAccess = getAuthentication(req, options.cronSecret) === 'cron';

  const billableItems: Array<{
    service: Pick<Service, 'id' | 'name' | 'cost' | 'recurrence'>;
    periods: string[];
  }> = [];

  // MARK: Gather billable items
  for (const service of services) {
    const startDate = dayjs(service.startDate);
    if (startDate.isAfter(now)) continue;

    if (service.recurrence === 'one-time') {
      if (service.lastInvoicedAt === null) {
        billableItems.push({
          service,
          periods: [now.format('DD.MM.YYYY')],
        });
      }
      continue;
    }

    let lastInvoicedAt = dayjs(service.lastInvoicedAt ?? service.startDate);

    const periods: string[] = [];

    while (lastInvoicedAt.isBefore(now)) {
      switch (service.recurrence) {
        case 'monthly':
          lastInvoicedAt = lastInvoicedAt.add(1, 'month');
          if (lastInvoicedAt.isAfter(now)) break;
          periods.push(lastInvoicedAt.format('MMM'));
          break;
        case 'yearly':
          lastInvoicedAt = lastInvoicedAt.add(1, 'year');
          if (lastInvoicedAt.isAfter(now)) break;
          periods.push(lastInvoicedAt.format('YYYY'));
          break;
      }
    }
    if (periods.length === 0) continue;
    billableItems.push({
      service,
      periods,
    });
  }

  if (billableItems.length === 0) return null;

  // MARK: i18n – contact preferences
  // Use direct translation lookup instead of req.t() because Payload's t()
  // doesn't reliably respect the { lng } option to override request locale.
  const lng = client.contact.language;
  const greeting = formatGreeting(client.contact);

  // MARK: Generate PDF

  const invoiceNumber = `${client.code}${now.format('YYMM')}`;
  const total = billableItems.reduce(
    (sum, { service, periods }) => sum + service.cost * periods.length,
    0,
  );

  // Get labels in client's language with invoice number for interpolated strings
  const labels = getInvoicePdfLabels(lng, { invoiceNumber });

  const pdfFile = await generateInvoicePdf({
    invoiceNumber,
    date: now.format('DD.MM.YYYY'),
    paymentTerms: labels.paymentTermsValue,
    client: {
      name: client.name,
      address: client.address,
      zip: client.zip,
      city: client.city,
      country: client.country,
    },
    company: {
      name: settings.company.name,
      address: settings.company.address,
      website: settings.company.website,
      uid: settings.company.uid,
      contact: settings.contact,
      bank: settings.bank,
      zip: settings.company.zip,
      city: settings.company.city,
      country: settings.company.country,
      logo: settings.company.logo,
    },
    items: billableItems.flatMap(({ service, periods }) =>
      periods.map((period) => ({
        description: `${service.name} (${period})`,
        cost: service.cost,
      })),
    ),
    total,
    message: labels.invoiceMessage,
    labels: {
      title: labels.title,
      invoiceNumber: labels.invoiceNumber,
      date: labels.date,
      paymentTerms: labels.paymentTerms,
      greeting,
      greetingBody: labels.greetingBody,
      tableService: labels.tableService,
      tableCost: labels.tableCost,
      tableTotal: labels.tableTotal,
      footerCreditor: labels.footerCreditor,
      footerContact: labels.footerContact,
      footerBank: labels.footerBank,
      qrBill: labels.qrBill,
    },
  })
    .then(
      (data): File => ({
        data,
        size: data.length,
        name: `${labels.title}_${invoiceNumber}.pdf`,
        mimetype: 'application/pdf',
      }),
    )
    .catch((error) => {
      options.onError?.(error as Error, {
        operation: 'generateInvoicePdf',
        metadata: {
          invoiceNumber,
          clientName: client.name,
          clientId: client.id,
        },
      });
      return null;
    });

  if (pdfFile === null)
    return {
      client: client.name,
      invoiceNumber,
      error: 'Failed to generate PDF',
    };

  // START TRANSACTION

  // MARK: Store PDF

  const mediaDoc = await req.payload.create({
    collection: 'invoice-pdfs',
    data: {},
    file: pdfFile,
    overrideAccess,
    req,
  });

  const invoiceData: Pick<
    Invoice,
    'invoiceNumber' | 'client' | 'items' | 'total' | 'date' | 'pdf'
  > = {
    invoiceNumber,
    client: client.id,
    items: billableItems.flatMap(({ service, periods }) =>
      periods.map(() => ({
        service: service.id,
        cost: service.cost,
      })),
    ),
    total,
    date: now.format('YYYY-MM-DD'),
    pdf: mediaDoc.id,
  };

  // MARK: Create Invoice

  // MARK: Send Email

  let emailSent = false;

  try {
    const emailStrings = getInvoiceEmailStrings(lng, { invoiceNumber });
    const text = `${greeting}

${emailStrings.emailBody}

${emailStrings.emailQuestion}

${emailStrings.emailClosing}
${settings.company.name}`;
    await req.payload.sendEmail({
      to: client.contact.email,
      subject: emailStrings.emailSubject,
      text,
      attachments: [
        {
          filename: pdfFile.name,
          content: pdfFile.data,
        },
      ],
    });
    emailSent = true;
  } catch (error) {
    options.onError?.(error as Error, {
      operation: 'sendInvoiceEmail',
      metadata: {
        invoiceNumber,
        clientName: client.name,
        clientId: client.id,
        clientEmail: client.contact.email,
      },
    });
  }

  await req.payload.create({
    collection: 'invoices',
    data: {
      ...invoiceData,
      status: emailSent ? 'sent' : 'generated',
      sentAt: emailSent ? now.toISOString() : undefined,
    },
    overrideAccess,
    req,
  });

  if (!emailSent) {
    return {
      client: client.name,
      invoiceNumber,
      error: 'Failed to send email',
    };
  }

  // MARK: Mark Services as Invoiced

  for (const { service } of billableItems) {
    await req.payload.update({
      collection: 'services',
      id: service.id,
      data: {
        lastInvoicedAt: now.format('YYYY-MM-DD'),
      },
      overrideAccess,
      req,
    });
  }

  return {
    client: client.name,
    invoiceNumber,
  };
};
