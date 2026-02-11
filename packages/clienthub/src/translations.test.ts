import { describe, expect, test } from 'vitest';

import {
  formatGreeting,
  getInvoiceEmailStrings,
  getInvoicePdfLabels,
} from './translations';

describe('getInvoiceEmailStrings', () => {
  const languages = ['de', 'fr', 'it', 'en'] as const;

  for (const lng of languages) {
    test(`returns all 4 email fields for ${lng}`, () => {
      const result = getInvoiceEmailStrings(lng);
      expect(result).toHaveProperty('emailSubject');
      expect(result).toHaveProperty('emailBody');
      expect(result).toHaveProperty('emailQuestion');
      expect(result).toHaveProperty('emailClosing');
      expect(typeof result.emailSubject).toBe('string');
      expect(typeof result.emailBody).toBe('string');
    });
  }

  test('interpolates invoiceNumber in subject', () => {
    const result = getInvoiceEmailStrings('en', { invoiceNumber: 'INV-001' });
    expect(result.emailSubject).toBe('Invoice INV-001');
  });

  test('handles missing invoiceNumber', () => {
    const result = getInvoiceEmailStrings('en');
    expect(result.emailSubject).toBe('Invoice ');
  });
});

describe('getInvoicePdfLabels', () => {
  const languages = ['de', 'fr', 'it', 'en'] as const;

  for (const lng of languages) {
    test(`returns all PDF labels for ${lng}`, () => {
      const result = getInvoicePdfLabels(lng);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('invoiceNumber');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('paymentTerms');
      expect(result).toHaveProperty('tableService');
      expect(result).toHaveProperty('tableTotal');
      expect(result).toHaveProperty('invoiceMessage');
      expect(result).toHaveProperty('qrBill');
    });
  }

  test('interpolates invoiceNumber in invoiceMessage', () => {
    const result = getInvoicePdfLabels('en', { invoiceNumber: 'INV-002' });
    expect(result.invoiceMessage).toBe('Invoice INV-002');
  });

  test('includes qrBill nested object', () => {
    const result = getInvoicePdfLabels('en');
    expect(result.qrBill).toHaveProperty('paymentPart');
    expect(result.qrBill).toHaveProperty('receipt');
    expect(result.qrBill).toHaveProperty('account');
    expect(result.qrBill).toHaveProperty('reference');
    expect(result.qrBill).toHaveProperty('currency');
    expect(result.qrBill).toHaveProperty('amount');
  });
});

describe('formatGreeting', () => {
  test('formal male greeting in German', () => {
    const result = formatGreeting({
      language: 'de',
      salutation: 'mr',
      formality: 'formal',
      firstname: 'Max',
      lastname: 'Müller',
    });
    expect(result).toBe('Sehr geehrter Herr Müller,');
  });

  test('formal female greeting in French', () => {
    const result = formatGreeting({
      language: 'fr',
      salutation: 'ms',
      formality: 'formal',
      firstname: 'Marie',
      lastname: 'Dupont',
    });
    expect(result).toBe('Chère Madame Dupont,');
  });

  test('informal male greeting in English', () => {
    const result = formatGreeting({
      language: 'en',
      salutation: 'mr',
      formality: 'informal',
      firstname: 'John',
      lastname: 'Doe',
    });
    expect(result).toBe('Hi John,');
  });

  test('informal female greeting in Italian', () => {
    const result = formatGreeting({
      language: 'it',
      salutation: 'ms',
      formality: 'informal',
      firstname: 'Giulia',
      lastname: 'Rossi',
    });
    expect(result).toBe('Cara Giulia,');
  });

  test('neutral gender uses firstname + lastname (formal)', () => {
    const result = formatGreeting({
      language: 'en',
      salutation: 'mx',
      formality: 'formal',
      firstname: 'Alex',
      lastname: 'Smith',
    });
    // mx has title "Mx.", so it uses: Dear Mx. Smith,
    expect(result).toBe('Dear Mx. Smith,');
  });

  test('dr title in formal greeting', () => {
    const result = formatGreeting({
      language: 'de',
      salutation: 'dr',
      formality: 'formal',
      firstname: 'Anna',
      lastname: 'Schmidt',
    });
    expect(result).toBe('Guten Tag Dr. Schmidt,');
  });

  test('prof title in formal greeting', () => {
    const result = formatGreeting({
      language: 'en',
      salutation: 'prof',
      formality: 'formal',
      firstname: 'James',
      lastname: 'Watson',
    });
    expect(result).toBe('Dear Prof. Watson,');
  });

  test('greeting without title uses firstname + lastname', () => {
    const result = formatGreeting({
      language: 'de',
      salutation: 'mx',
      formality: 'formal',
      firstname: 'Robin',
      lastname: 'Meier',
    });
    // mx in German has empty title, so falls back to firstname + lastname
    expect(result).toBe('Guten Tag Robin Meier,');
  });
});
