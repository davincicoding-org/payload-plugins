// ============================================
// TRANSLATIONS FOR PAYLOAD CONFIG
// ============================================

import type { Client } from '@/payload-types';

/** Invoice translations to register with Payload's i18n config */
export const invoiceTranslations = {
  de: {
    invoice: {
      title: 'Rechnung',
      invoiceNumber: 'Rechnungsnr.',
      date: 'Datum',
      paymentTerms: 'Zahlbar bis',
      paymentTermsValue: '14 Tage nach Empfang',
      greetingBody: 'Gerne stelle ich folgende Leistung in Rechnung.',
      tableService: 'Service',
      tableCost: 'Kosten',
      tableTotal: 'Total',
      invoiceMessage: 'Rechnung {{invoiceNumber}}',
      footerCreditor: 'Rechnungssteller',
      footerContact: 'Kontaktperson',
      footerBank: 'Bankverbindung',
      qrPaymentPart: 'Zahlteil',
      qrReceipt: 'Empfangsschein',
      qrAccount: 'Konto / Zahlbar an',
      qrReference: 'Referenz',
      qrAdditionalInfo: 'Zusätzliche Informationen',
      qrPayableBy: 'Zahlbar durch',
      qrPayableByBlank: 'Zahlbar durch (Name/Adresse)',
      qrCurrency: 'Währung',
      qrAmount: 'Betrag',
      qrAcceptancePoint: 'Annahmestelle',
      emailSubject: 'Rechnung {{invoiceNumber}}',
      emailBody: 'anbei die Rechnung für unsere Dienstleistungen.',
      emailQuestion: 'Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
      emailClosing: 'Beste Grüsse,',
    },
  },
  fr: {
    invoice: {
      title: 'Facture',
      invoiceNumber: 'N° de facture',
      date: 'Date',
      paymentTerms: "Payable jusqu'au",
      paymentTermsValue: '14 jours après réception',
      greetingBody:
        'Je vous prie de trouver ci-joint la facture pour nos services.',
      tableService: 'Service',
      tableCost: 'Coût',
      tableTotal: 'Total',
      invoiceMessage: 'Facture {{invoiceNumber}}',
      footerCreditor: 'Émetteur',
      footerContact: 'Contact',
      footerBank: 'Coordonnées bancaires',
      qrPaymentPart: 'Section paiement',
      qrReceipt: 'Récépissé',
      qrAccount: 'Compte / Payable à',
      qrReference: 'Référence',
      qrAdditionalInfo: 'Informations supplémentaires',
      qrPayableBy: 'Payable par',
      qrPayableByBlank: 'Payable par (nom/adresse)',
      qrCurrency: 'Monnaie',
      qrAmount: 'Montant',
      qrAcceptancePoint: 'Point de dépôt',
      emailSubject: 'Facture {{invoiceNumber}}',
      emailBody: 'veuillez trouver ci-joint la facture pour nos services.',
      emailQuestion: "N'hésitez pas à nous contacter pour toute question.",
      emailClosing: 'Cordialement,',
    },
  },
  it: {
    invoice: {
      title: 'Fattura',
      invoiceNumber: 'N. fattura',
      date: 'Data',
      paymentTerms: 'Pagabile entro',
      paymentTermsValue: '14 giorni dal ricevimento',
      greetingBody: 'Le invio in allegato la fattura per i nostri servizi.',
      tableService: 'Servizio',
      tableCost: 'Costo',
      tableTotal: 'Totale',
      invoiceMessage: 'Fattura {{invoiceNumber}}',
      footerCreditor: 'Emittente',
      footerContact: 'Contatto',
      footerBank: 'Coordinate bancarie',
      qrPaymentPart: 'Sezione pagamento',
      qrReceipt: 'Ricevuta',
      qrAccount: 'Conto / Pagabile a',
      qrReference: 'Riferimento',
      qrAdditionalInfo: 'Informazioni supplementari',
      qrPayableBy: 'Pagabile da',
      qrPayableByBlank: 'Pagabile da (nome/indirizzo)',
      qrCurrency: 'Valuta',
      qrAmount: 'Importo',
      qrAcceptancePoint: 'Punto di accettazione',
      emailSubject: 'Fattura {{invoiceNumber}}',
      emailBody: 'in allegato la fattura per i nostri servizi.',
      emailQuestion: 'Per qualsiasi domanda, non esiti a contattarci.',
      emailClosing: 'Cordiali saluti,',
    },
  },
  en: {
    invoice: {
      title: 'Invoice',
      invoiceNumber: 'Invoice No.',
      date: 'Date',
      paymentTerms: 'Due by',
      paymentTermsValue: '14 days upon receipt',
      greetingBody: 'Please find attached the invoice for our services.',
      tableService: 'Service',
      tableCost: 'Cost',
      tableTotal: 'Total',
      invoiceMessage: 'Invoice {{invoiceNumber}}',
      footerCreditor: 'Biller',
      footerContact: 'Contact',
      footerBank: 'Bank details',
      qrPaymentPart: 'Payment part',
      qrReceipt: 'Receipt',
      qrAccount: 'Account / Payable to',
      qrReference: 'Reference',
      qrAdditionalInfo: 'Additional information',
      qrPayableBy: 'Payable by',
      qrPayableByBlank: 'Payable by (name/address)',
      qrCurrency: 'Currency',
      qrAmount: 'Amount',
      qrAcceptancePoint: 'Acceptance point',
      emailSubject: 'Invoice {{invoiceNumber}}',
      emailBody: 'Please find attached the invoice for our services.',
      emailQuestion: "If you have any questions, don't hesitate to contact us.",
      emailClosing: 'Best regards,',
    },
  },
};

// ============================================
// SALUTATION & GREETING HELPERS
// ============================================

const salutationTitles = {
  de: {
    mr: 'Herr',
    ms: 'Frau',
    miss: 'Frau',
    mx: '',
    dr: 'Dr.',
    prof: 'Prof.',
  },
  fr: {
    mr: 'Monsieur',
    ms: 'Madame',
    miss: 'Mademoiselle',
    mx: '',
    dr: 'Dr',
    prof: 'Prof.',
  },
  it: {
    mr: 'Signor',
    ms: 'Signora',
    miss: 'Signorina',
    mx: '',
    dr: 'Dott.',
    prof: 'Prof.',
  },
  en: {
    mr: 'Mr.',
    ms: 'Ms.',
    miss: 'Miss',
    mx: 'Mx.',
    dr: 'Dr.',
    prof: 'Prof.',
  },
} as const;

const formalGreetingPrefix = {
  de: { male: 'Sehr geehrter', female: 'Sehr geehrte', neutral: 'Guten Tag' },
  fr: { male: 'Cher', female: 'Chère', neutral: 'Bonjour' },
  it: { male: 'Gentile', female: 'Gentile', neutral: 'Gentile' },
  en: { male: 'Dear', female: 'Dear', neutral: 'Dear' },
} as const;

const informalGreetingPrefix = {
  de: { male: 'Lieber', female: 'Liebe', neutral: 'Hallo' },
  fr: { male: 'Cher', female: 'Chère', neutral: 'Salut' },
  it: { male: 'Caro', female: 'Cara', neutral: 'Ciao' },
  en: { male: 'Hi', female: 'Hi', neutral: 'Hi' },
} as const;

function getGender(
  salutation: Client['contact']['salutation'],
): 'male' | 'female' | 'neutral' {
  switch (salutation) {
    case 'mr':
      return 'male';
    case 'ms':
    case 'miss':
      return 'female';
    default:
      return 'neutral';
  }
}

/**
 * Get invoice strings in the given language.
 *
 * IMPORTANT: Use this instead of `req.t("invoice:*", { lng })` because
 * Payload's t() function does not reliably respect the `lng` option to
 * override the request locale. This direct lookup ensures correct language.
 */
function getInvoiceStrings(
  lng: Client['contact']['language'],
): (typeof invoiceTranslations)['en']['invoice'] {
  return invoiceTranslations[lng].invoice;
}

/**
 * Get invoice email copy in the given language.
 * Use this for outgoing emails so body/question/closing match the client's language
 * (req.t uses request locale, which may differ when e.g. cron runs in default locale).
 */
export function getInvoiceEmailStrings(
  lng: Client['contact']['language'],
  vars: { invoiceNumber?: string } = {},
): {
  emailSubject: string;
  emailBody: string;
  emailQuestion: string;
  emailClosing: string;
} {
  const inv = getInvoiceStrings(lng);
  const subject = (inv.emailSubject ?? '').replace(
    '{{invoiceNumber}}',
    vars.invoiceNumber ?? '',
  );
  return {
    emailSubject: subject,
    emailBody: inv.emailBody,
    emailQuestion: inv.emailQuestion,
    emailClosing: inv.emailClosing,
  };
}

/**
 * Get invoice PDF labels in the given language.
 * Use this for PDF generation to ensure correct language regardless of request locale.
 */
export function getInvoicePdfLabels(
  lng: Client['contact']['language'],
  vars: { invoiceNumber?: string } = {},
): {
  title: string;
  invoiceNumber: string;
  date: string;
  paymentTerms: string;
  paymentTermsValue: string;
  greetingBody: string;
  tableService: string;
  tableCost: string;
  tableTotal: string;
  invoiceMessage: string;
  footerCreditor: string;
  footerContact: string;
  footerBank: string;
  qrBill: {
    paymentPart: string;
    receipt: string;
    account: string;
    reference: string;
    additionalInfo: string;
    payableBy: string;
    payableByBlank: string;
    currency: string;
    amount: string;
    acceptancePoint: string;
  };
} {
  const inv = getInvoiceStrings(lng);
  return {
    title: inv.title,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    paymentTerms: inv.paymentTerms,
    paymentTermsValue: inv.paymentTermsValue,
    greetingBody: inv.greetingBody,
    tableService: inv.tableService,
    tableCost: inv.tableCost,
    tableTotal: inv.tableTotal,
    invoiceMessage: (inv.invoiceMessage ?? '').replace(
      '{{invoiceNumber}}',
      vars.invoiceNumber ?? '',
    ),
    footerCreditor: inv.footerCreditor,
    footerContact: inv.footerContact,
    footerBank: inv.footerBank,
    qrBill: {
      paymentPart: inv.qrPaymentPart,
      receipt: inv.qrReceipt,
      account: inv.qrAccount,
      reference: inv.qrReference,
      additionalInfo: inv.qrAdditionalInfo,
      payableBy: inv.qrPayableBy,
      payableByBlank: inv.qrPayableByBlank,
      currency: inv.qrCurrency,
      amount: inv.qrAmount,
      acceptancePoint: inv.qrAcceptancePoint,
    },
  };
}

/** Format personalized greeting based on contact preferences */
export function formatGreeting(opts: {
  language: Client['contact']['language'];
  salutation: Client['contact']['salutation'];
  formality: Client['contact']['formality'];
  firstname: string;
  lastname: string;
}): string {
  const { language, salutation, formality, firstname, lastname } = opts;
  const gender = getGender(salutation);

  if (formality === 'informal') {
    const prefix = informalGreetingPrefix[language][gender];
    return `${prefix} ${firstname},`;
  }

  const prefix = formalGreetingPrefix[language][gender];
  const title = salutationTitles[language][salutation];

  if (salutation === 'dr' || salutation === 'prof') {
    return `${prefix} ${title} ${lastname},`;
  }

  if (title) {
    return `${prefix} ${title} ${lastname},`;
  }

  return `${prefix} ${firstname} ${lastname},`;
}
