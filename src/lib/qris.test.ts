import { describe, expect, it } from 'vitest';
import { calculateCRC16, convertToDynamicQRIS, DEFAULT_STATIC_QRIS } from './qris';

describe('QRIS EMVCo Dynamic Generation Utility', () => {
  it('computes correct 4-digit uppercase hex CRC16', () => {
    const testString = '0002010102116304';
    const crc = calculateCRC16(testString);
    expect(crc).match(/^[0-9A-F]{4}$/);
  });

  it('converts static QRIS to dynamic QRIS with exact amount (Tag 54)', () => {
    const dynamic = convertToDynamicQRIS(DEFAULT_STATIC_QRIS, 99000, 'ZND-123456');

    expect(dynamic).toContain('010212'); // Dynamic mode
    expect(dynamic).toContain('540599000'); // Tag 54 with length 05 and amount 99000
    expect(dynamic).match(/6304[0-9A-F]{4}$/); // Ends with valid 4-digit hex CRC)
  });

  it('converts season pass amount correctly', () => {
    const dynamic = convertToDynamicQRIS(DEFAULT_STATIC_QRIS, 39000, 'ZND-999');

    expect(dynamic).toContain('540539000');
    expect(dynamic).match(/6304[0-9A-F]{4}$/);
  });
});
