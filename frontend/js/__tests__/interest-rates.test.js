// ============================================================
// interest-rates.test.js
// Unit tests for calculateProjectedSavings in interest-rates.js
// Covers: normal cases, boundary cases, equivalence classes
// ============================================================

import { calculateProjectedSavings } from '../interest-rates.js';

describe('calculateProjectedSavings', () => {

  // ── Normal cases ───────────────────────────────────────────

  test('returns a positive value for valid inputs', () => {
    const result = calculateProjectedSavings(500, 12, 10.25);
    expect(result).toBeGreaterThan(0);
  });

  test('returns more than total contributions due to interest', () => {
    const monthly = 500;
    const months  = 12;
    const result  = calculateProjectedSavings(monthly, months, 10.25);
    expect(result).toBeGreaterThan(monthly * months);
  });

  test('higher interest rate produces higher return', () => {
    const low  = calculateProjectedSavings(500, 12, 5);
    const high = calculateProjectedSavings(500, 12, 15);
    expect(high).toBeGreaterThan(low);
  });

  test('more months produces higher return', () => {
    const short = calculateProjectedSavings(500, 6, 10.25);
    const long  = calculateProjectedSavings(500, 24, 10.25);
    expect(long).toBeGreaterThan(short);
  });

  test('higher monthly contribution produces higher return', () => {
    const small = calculateProjectedSavings(500,  12, 10.25);
    const large = calculateProjectedSavings(1000, 12, 10.25);
    expect(large).toBeGreaterThan(small);
  });

  test('calculates correctly for 1 month', () => {
    // After 1 month: (0 + 500) * (1 + 0.1025/12)
    const rate   = 10.25 / 100 / 12;
    const expected = 500 * (1 + rate);
    const result = calculateProjectedSavings(500, 1, 10.25);
    expect(result).toBeCloseTo(expected, 2);
  });

  test('returns a number type', () => {
    const result = calculateProjectedSavings(500, 12, 10.25);
    expect(typeof result).toBe('number');
  });

  // ── Boundary cases ─────────────────────────────────────────

  test('returns 0 for 0 months', () => {
    const result = calculateProjectedSavings(500, 0, 10.25);
    expect(result).toBe(0);
  });

  test('returns 0 for 0 monthly contribution', () => {
    const result = calculateProjectedSavings(0, 12, 10.25);
    expect(result).toBe(0);
  });

  test('handles 0% interest rate', () => {
    // With 0% interest, future value equals total contributions
    const result = calculateProjectedSavings(500, 12, 0);
    expect(result).toBeCloseTo(500 * 12, 0);
  });

  test('handles very small contribution (R1)', () => {
    const result = calculateProjectedSavings(1, 12, 10.25);
    expect(result).toBeGreaterThan(0);
  });

  test('handles very large contribution (R100000)', () => {
    const result = calculateProjectedSavings(100000, 12, 10.25);
    expect(result).toBeGreaterThan(100000 * 12);
  });

  test('handles 1 month with 0% interest', () => {
    const result = calculateProjectedSavings(500, 1, 0);
    expect(result).toBeCloseTo(500, 2);
  });

  test('handles large number of months (120 = 10 years)', () => {
    const result = calculateProjectedSavings(500, 120, 10.25);
    expect(result).toBeGreaterThan(500 * 120);
  });

  // ── Equivalence classes ────────────────────────────────────

  test('low contribution class (R1 - R499)', () => {
    const result = calculateProjectedSavings(250, 12, 10.25);
    expect(result).toBeGreaterThan(0);
  });

  test('medium contribution class (R500 - R2000)', () => {
    const result = calculateProjectedSavings(1000, 12, 10.25);
    expect(result).toBeGreaterThan(1000 * 12);
  });

  test('high contribution class (R2000+)', () => {
    const result = calculateProjectedSavings(5000, 12, 10.25);
    expect(result).toBeGreaterThan(5000 * 12);
  });

  test('short term class (1-6 months)', () => {
    const result = calculateProjectedSavings(500, 3, 10.25);
    expect(result).toBeGreaterThan(0);
  });

  test('medium term class (7-24 months)', () => {
    const result = calculateProjectedSavings(500, 12, 10.25);
    expect(result).toBeGreaterThan(0);
  });

  test('long term class (25+ months)', () => {
    const result = calculateProjectedSavings(500, 36, 10.25);
    expect(result).toBeGreaterThan(500 * 36);
  });

  test('low interest rate class (0-5%)', () => {
    const result = calculateProjectedSavings(500, 12, 3);
    expect(result).toBeGreaterThan(500 * 12);
  });

  test('medium interest rate class (5-12%)', () => {
    const result = calculateProjectedSavings(500, 12, 10.25);
    expect(result).toBeGreaterThan(500 * 12);
  });

  test('high interest rate class (12%+)', () => {
    const result = calculateProjectedSavings(500, 12, 15);
    expect(result).toBeGreaterThan(500 * 12);
  });
});
