import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Swiss QR Bill specifications
// See: https://www.paymentstandards.ch/dam/downloads/ig-qr-bill-en.pdf

export interface SwissQRBillData {
  /** Creditor information */
  creditor: {
    /** IBAN or QR-IBAN (21 characters, CH/LI only) */
    iban: string;
    /** Name (max 70 characters) */
    name: string;
    /** Street and building number (max 70 characters) */
    address: string;
    /** Postal code (max 16 characters) */
    zip: string;
    /** City (max 35 characters) */
    city: string;
    /** Country code (2 characters, e.g., "CH") */
    country: string;
  };
  /** Amount (optional, max 12 digits including decimals) */
  amount?: number;
  /** Currency: CHF or EUR */
  currency: 'CHF' | 'EUR';
  /** Debtor information (optional) */
  debtor?: {
    /** Name (max 70 characters) */
    name: string;
    /** Street and building number (max 70 characters) */
    address: string;
    /** Postal code (max 16 characters) */
    zip: string;
    /** City (max 35 characters) */
    city: string;
    /** Country code (2 characters) */
    country: string;
  };
  /** Reference number (QR reference or Creditor Reference, max 27 characters) */
  reference?: string;
  /** Additional information / message (max 140 characters) */
  message?: string;
}

/** Pre-translated labels for Swiss QR Bill */
export interface SwissQRBillLabels {
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
}

// Swiss cross dimensions in mm (for reference)
// The Swiss cross is 7mm x 7mm in the actual QR code specification

/**
 * Generate the QR code payload string according to Swiss QR Bill specification
 */
function generateQRPayload(data: SwissQRBillData): string {
  const lines: string[] = [];

  // Header
  lines.push('SPC'); // QR Type
  lines.push('0200'); // Version
  lines.push('1'); // Coding Type (UTF-8)

  // Creditor Account (IBAN)
  lines.push(data.creditor.iban.replace(/\s/g, ''));

  // Creditor (Combined address type "K")
  lines.push('K'); // Address type: K = Combined
  lines.push(data.creditor.name);
  lines.push(data.creditor.address);
  lines.push(`${data.creditor.zip} ${data.creditor.city}`);
  lines.push(''); // Empty for combined address
  lines.push(''); // Empty for combined address
  lines.push(data.creditor.country);

  // Ultimate Creditor (empty - not used)
  lines.push(''); // Address type
  lines.push(''); // Name
  lines.push(''); // Address line 1
  lines.push(''); // Address line 2
  lines.push(''); // Empty
  lines.push(''); // Empty
  lines.push(''); // Country

  // Payment amount
  lines.push(data.amount ? data.amount.toFixed(2) : '');
  lines.push(data.currency);

  // Debtor
  if (data.debtor) {
    lines.push('K'); // Address type: K = Combined
    lines.push(data.debtor.name);
    lines.push(data.debtor.address);
    lines.push(`${data.debtor.zip} ${data.debtor.city}`);
    lines.push(''); // Empty for combined address
    lines.push(''); // Empty for combined address
    lines.push(data.debtor.country);
  } else {
    lines.push(''); // Address type
    lines.push(''); // Name
    lines.push(''); // Address line 1
    lines.push(''); // Address line 2
    lines.push(''); // Empty
    lines.push(''); // Empty
    lines.push(''); // Country
  }

  // Reference type and number
  const reference = data.reference?.replace(/\s/g, '') ?? '';
  if (reference.startsWith('RF')) {
    lines.push('SCOR'); // Creditor Reference (ISO 11649)
  } else if (reference.length > 0) {
    lines.push('QRR'); // QR Reference
  } else {
    lines.push('NON'); // No reference
  }
  lines.push(reference);

  // Additional information
  lines.push(data.message ?? '');

  // Trailer
  lines.push('EPD'); // End Payment Data

  return lines.join('\n');
}

/**
 * Generate Swiss QR Code with Swiss Cross overlay as base64 data URL
 */
export async function generateSwissQRCode(
  data: SwissQRBillData,
): Promise<string> {
  const payload = generateQRPayload(data);

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M', // Medium error correction (required for Swiss QR Bill)
    margin: 0,
    width: 166, // ~46mm at 72 DPI (Swiss QR Bill spec)
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return qrDataUrl;
}

/**
 * Format IBAN for display (groups of 4)
 */
function formatIBAN(iban: string): string {
  return iban
    .replace(/\s/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/**
 * Format amount for display
 */
function formatAmount(amount: number | undefined): string {
  if (amount === undefined) return '';
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format reference number for display
 */
function formatReference(reference: string | undefined): string {
  if (!reference) return '';
  const clean = reference.replace(/\s/g, '');
  if (clean.startsWith('RF')) {
    // Creditor Reference: RF + 2 check digits + reference (groups of 4)
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }
  // QR Reference: groups of 5, starting from right
  return clean.replace(/(\d)(?=(\d{5})+$)/g, '$1 ');
}

// Component styles following Swiss QR Bill dimensions
// A4 width: 210mm, Receipt width: 62mm, Payment part width: 148mm
// Height is flexible to avoid overlap - content determines height
const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    borderTopStyle: 'dashed',
    fontFamily: 'Helvetica',
    marginTop: 20, // Space from content above
  },
  separatorText: {
    fontSize: 7,
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  separatorWrapper: {
    width: '100%',
  },

  // Receipt section (left, 62mm wide)
  receipt: {
    width: 175.73, // 62mm in points
    padding: 14.17, // 5mm
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderRightStyle: 'dashed',
  },
  receiptTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 14.17, // 5mm
  },
  receiptSection: {
    marginBottom: 8.5, // 3mm
  },
  receiptLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    marginBottom: 2.83, // 1mm
  },
  receiptValue: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  receiptAmountRow: {
    flexDirection: 'row',
    paddingTop: 14.17, // 5mm
  },
  receiptAmountCol: {
    flex: 1,
  },
  receiptAcceptance: {
    textAlign: 'right',
    fontSize: 6,
    fontWeight: 'bold',
    paddingTop: 14.17, // 5mm
  },

  // Payment part section (right, 148mm wide)
  paymentPart: {
    flex: 1,
    padding: 14.17, // 5mm
    flexDirection: 'row',
  },
  paymentPartLeft: {
    width: 153.07, // 54mm for QR code + amount section
    marginRight: 14.17, // 5mm
  },
  paymentPartRight: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 14.17, // 5mm
  },
  qrCodeContainer: {
    width: 130.39, // 46mm
    height: 130.39, // 46mm
    marginBottom: 8.5, // 3mm
    position: 'relative',
  },
  qrCode: {
    width: '100%',
    height: '100%',
  },
  swissCross: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 19.84, // 7mm
    height: 19.84, // 7mm
    marginTop: -9.92,
    marginLeft: -9.92,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swissCrossInner: {
    width: 15.87, // 5.6mm
    height: 15.87,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swissCrossVertical: {
    position: 'absolute',
    width: 4.25, // 1.5mm
    height: 11.34, // 4mm
    backgroundColor: '#000',
  },
  swissCrossHorizontal: {
    position: 'absolute',
    width: 11.34, // 4mm
    height: 4.25, // 1.5mm
    backgroundColor: '#000',
  },
  paymentAmountRow: {
    flexDirection: 'row',
  },
  paymentAmountCol: {
    marginRight: 14.17,
  },
  paymentSection: {
    marginBottom: 8.5, // 3mm
  },
  paymentLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2.83, // 1mm
  },
  paymentValue: {
    fontSize: 10,
    lineHeight: 1.3,
  },
  blankField: {
    width: 70.87, // 25mm
    height: 25.51, // 9mm
    borderWidth: 0.5,
    borderColor: '#000',
    marginTop: 2.83,
  },
  blankFieldLarge: {
    width: 170.08, // 60mm
    height: 56.69, // 20mm
    borderWidth: 0.5,
    borderColor: '#000',
    marginTop: 2.83,
  },
});

export interface SwissQRBillProps {
  data: SwissQRBillData;
  qrCodeDataUrl: string;
  labels: SwissQRBillLabels;
}

/**
 * Swiss QR Bill component for react-pdf
 * Flexible height - flows with document content
 */
export function SwissQRBill({ data, qrCodeDataUrl, labels }: SwissQRBillProps) {
  const t = labels;

  const formattedIBAN = formatIBAN(data.creditor.iban);
  const formattedAmount = formatAmount(data.amount);
  const formattedReference = formatReference(data.reference);

  return (
    <View style={styles.separatorWrapper}>
      {/* Main QR Bill container */}
      <View style={styles.container}>
        {/* Receipt Section */}
        <View style={styles.receipt}>
          <Text style={styles.receiptTitle}>{t.receipt}</Text>

          {/* Account / Payable to */}
          <View style={styles.receiptSection}>
            <Text style={styles.receiptLabel}>{t.account}</Text>
            <Text style={styles.receiptValue}>{formattedIBAN}</Text>
            <Text style={styles.receiptValue}>{data.creditor.name}</Text>
            <Text style={styles.receiptValue}>{data.creditor.address}</Text>
            <Text style={styles.receiptValue}>
              {data.creditor.zip} {data.creditor.city}
            </Text>
          </View>

          {/* Reference */}
          {data.reference && (
            <View style={styles.receiptSection}>
              <Text style={styles.receiptLabel}>{t.reference}</Text>
              <Text style={styles.receiptValue}>{formattedReference}</Text>
            </View>
          )}

          {/* Payable by */}
          <View style={styles.receiptSection}>
            <Text style={styles.receiptLabel}>
              {data.debtor ? t.payableBy : t.payableByBlank}
            </Text>
            {data.debtor ? (
              <>
                <Text style={styles.receiptValue}>{data.debtor.name}</Text>
                <Text style={styles.receiptValue}>{data.debtor.address}</Text>
                <Text style={styles.receiptValue}>
                  {data.debtor.zip} {data.debtor.city}
                </Text>
              </>
            ) : (
              <View style={styles.blankField} />
            )}
          </View>

          {/* Amount */}
          <View style={styles.receiptAmountRow}>
            <View style={styles.receiptAmountCol}>
              <Text style={styles.receiptLabel}>{t.currency}</Text>
              <Text style={styles.receiptValue}>{data.currency}</Text>
            </View>
            <View style={styles.receiptAmountCol}>
              <Text style={styles.receiptLabel}>{t.amount}</Text>
              {data.amount !== undefined ? (
                <Text style={styles.receiptValue}>{formattedAmount}</Text>
              ) : (
                <View style={styles.blankField} />
              )}
            </View>
          </View>

          {/* Acceptance point */}
          <Text style={styles.receiptAcceptance}>{t.acceptancePoint}</Text>
        </View>

        {/* Payment Part Section */}
        <View style={styles.paymentPart}>
          {/* Left side: QR code + amount */}
          <View style={styles.paymentPartLeft}>
            <Text style={styles.paymentTitle}>{t.paymentPart}</Text>

            {/* QR Code with Swiss Cross */}
            <View style={styles.qrCodeContainer}>
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
              {/* Swiss Cross overlay */}
              <View style={styles.swissCross}>
                <View style={styles.swissCrossInner}>
                  <View style={styles.swissCrossVertical} />
                  <View style={styles.swissCrossHorizontal} />
                </View>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.paymentAmountRow}>
              <View style={styles.paymentAmountCol}>
                <Text style={styles.paymentLabel}>{t.currency}</Text>
                <Text style={styles.paymentValue}>{data.currency}</Text>
              </View>
              <View style={styles.paymentAmountCol}>
                <Text style={styles.paymentLabel}>{t.amount}</Text>
                {data.amount !== undefined ? (
                  <Text style={styles.paymentValue}>{formattedAmount}</Text>
                ) : (
                  <View style={styles.blankField} />
                )}
              </View>
            </View>
          </View>

          {/* Right side: Details */}
          <View style={styles.paymentPartRight}>
            {/* Account / Payable to */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>{t.account}</Text>
              <Text style={styles.paymentValue}>{formattedIBAN}</Text>
              <Text style={styles.paymentValue}>{data.creditor.name}</Text>
              <Text style={styles.paymentValue}>{data.creditor.address}</Text>
              <Text style={styles.paymentValue}>
                {data.creditor.zip} {data.creditor.city}
              </Text>
            </View>

            {/* Reference */}
            {data.reference && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentLabel}>{t.reference}</Text>
                <Text style={styles.paymentValue}>{formattedReference}</Text>
              </View>
            )}

            {/* Additional information */}
            {data.message && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentLabel}>{t.additionalInfo}</Text>
                <Text style={styles.paymentValue}>{data.message}</Text>
              </View>
            )}

            {/* Payable by */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>
                {data.debtor ? t.payableBy : t.payableByBlank}
              </Text>
              {data.debtor ? (
                <>
                  <Text style={styles.paymentValue}>{data.debtor.name}</Text>
                  <Text style={styles.paymentValue}>{data.debtor.address}</Text>
                  <Text style={styles.paymentValue}>
                    {data.debtor.zip} {data.debtor.city}
                  </Text>
                </>
              ) : (
                <View style={styles.blankFieldLarge} />
              )}
            </View>
            {/* End paymentSection */}
          </View>
          {/* End paymentPartRight */}
        </View>
        {/* End paymentPart */}
      </View>
      {/* End container */}
    </View>
  );
}

/**
 * Helper to prepare Swiss QR Bill data and generate QR code
 * Call this before rendering to get the qrCodeDataUrl
 */
export async function prepareSwissQRBill(
  data: SwissQRBillData,
): Promise<{ data: SwissQRBillData; qrCodeDataUrl: string }> {
  const qrCodeDataUrl = await generateSwissQRCode(data);
  return { data, qrCodeDataUrl };
}
