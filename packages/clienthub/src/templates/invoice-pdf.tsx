import {
  Document,
  Image,
  Link,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { createElement } from 'react';
import {
  prepareSwissQRBill,
  SwissQRBill,
  type SwissQRBillData,
  type SwissQRBillLabels,
} from './swiss-qr-bill';

export interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  paymentTerms: string;
  client: {
    name: string;
    address: string;
    zip: string;
    city: string;
    country: string;
  };
  company: {
    name: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    website: string;
    uid: string;
    contact: {
      name: string;
      email: string;
      phone: string;
    };
    bank: {
      name: string;
      iban: string;
      bic: string;
    };
    logo: string | undefined | null;
  };
  items: Array<{
    description: string;
    cost: number;
  }>;
  total: number;
  /** Reference number for QR Bill (optional) */
  reference?: string;
  /** Message for QR Bill (optional) */
  message?: string;
  /** Pre-translated labels */
  labels: {
    title: string;
    invoiceNumber: string;
    date: string;
    paymentTerms: string;
    greeting: string;
    greetingBody: string;
    tableService: string;
    tableCost: string;
    tableTotal: string;
    footerCreditor: string;
    footerContact: string;
    footerBank: string;
    qrBill: SwissQRBillLabels;
  };
}

/** Internal data with pre-generated QR code */
interface InvoiceDocumentData extends InvoicePdfData {
  qrBill?: {
    data: SwissQRBillData;
    qrCodeDataUrl: string;
  };
}

const currency = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
});

function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const {
    invoiceNumber,
    date,
    paymentTerms,
    client,
    company,
    items,
    total,
    qrBill,
    labels,
  } = data;

  return (
    <Document title={`${labels.title} ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo ? (
              <Image src={company.logo} style={styles.logo} />
            ) : null}
            <Text style={styles.title}>{labels.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerRow}>
              {labels.invoiceNumber}: {invoiceNumber}
            </Text>
            <Text style={styles.headerRow}>
              {labels.date}: {date}
            </Text>
            <Text style={styles.headerRow}>
              {labels.paymentTerms}: {paymentTerms}
            </Text>
          </View>
        </View>

        <View style={styles.clientSection}>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text>{client.address}</Text>
          <Text>
            {client.zip} {client.city}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>{labels.tableService}</Text>
            <Text style={styles.col3}>{labels.tableCost}</Text>
          </View>
          {items.map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.tableRow}>
              <Text style={styles.col1}>{index + 1}</Text>
              <Text style={styles.col2}>{item.description}</Text>
              <Text style={styles.col3}>{currency.format(item.cost)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.col1} />
            <Text style={styles.col2}>{labels.tableTotal}</Text>
            <Text style={styles.col3}>{currency.format(total)}</Text>
          </View>
        </View>

        {/* Swiss QR Bill or Legacy Footer */}
        {qrBill ? (
          <View style={styles.qrBillContainer}>
            <SwissQRBill
              data={qrBill.data}
              labels={labels.qrBill}
              qrCodeDataUrl={qrBill.qrCodeDataUrl}
            />
          </View>
        ) : (
          <View style={styles.footer}>
            <View style={styles.footerCol}>
              <Text style={styles.footerTitle}>{labels.footerCreditor}</Text>
              <Text>{company.name}</Text>
              <Text>{company.address}</Text>
              <Text>{company.uid}</Text>
              <Link href={company.website}>
                {new URL(company.website).hostname}
              </Link>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerTitle}>{labels.footerContact}</Text>
              <Text>{company.contact.name}</Text>
              <Text>{company.contact.phone}</Text>
              <Link href={`mailto:${company.contact.email}`}>
                {company.contact.email}
              </Link>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerTitle}>{labels.footerBank}</Text>
              <Text>{company.bank.iban}</Text>
              <Text>
                {company.bank.name} ({company.bank.bic})
              </Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function generateInvoicePdf(
  data: InvoicePdfData,
): Promise<Buffer> {
  let documentData: InvoiceDocumentData = { ...data };

  // Prepare Swiss QR Bill if structured addresses are available and enabled
  if (data.company.country === 'CH') {
    const qrBillData: SwissQRBillData = {
      creditor: {
        iban: data.company.bank.iban,
        name: data.company.name,
        address: data.company.address.split('\n')[0] ?? data.company.address,
        zip: data.company.zip,
        city: data.company.city,
        country: data.company.country,
      },
      amount: data.total,
      currency: 'CHF',
      debtor: {
        name: data.client.name,
        address: data.client.address.split('\n')[0] ?? data.client.address,
        zip: data.client.zip,
        city: data.client.city,
        country: data.client.country,
      },
      reference: data.reference,
      message: data.message ?? `${data.labels.title} ${data.invoiceNumber}`,
    };

    const prepared = await prepareSwissQRBill(qrBillData);

    documentData = {
      ...data,
      qrBill: {
        data: prepared.data,
        qrCodeDataUrl: prepared.qrCodeDataUrl,
      },
    };
  }

  const documentElement = createElement(InvoiceDocument, {
    data: documentData,
  });
  return renderToBuffer(
    documentElement as Parameters<typeof renderToBuffer>[0],
  ) as Promise<Buffer>;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    width: 140,
    height: 12,
    objectFit: 'contain',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerRight: {
    textAlign: 'right',
  },
  headerRow: {
    marginBottom: 4,
  },
  clientSection: {
    marginBottom: 24,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  greeting: {
    marginBottom: 24,
  },
  table: {
    marginTop: 16,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  col1: { width: '8%' },
  col2: { width: '72%' },
  col3: { width: '20%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  closing: {
    marginTop: 32,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 16,
    marginTop: 40,
  },
  qrBillContainer: {
    marginTop: 'auto', // Push to bottom if space available
    marginLeft: -40, // Compensate for page padding
    marginRight: -40,
    marginBottom: -40,
  },
  footerCol: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    marginBottom: 4,
    color: '#666',
  },
});
