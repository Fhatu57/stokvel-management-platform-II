/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  getLatestInterestRates: jest.fn()
}));

import { getLatestInterestRates } from '../supabase-client.js';

import {
  calculateProjectedSavings
} from '../interest-rates.js';

describe('interest-rates.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <div id="prime-rate"></div>
      <div id="repo-rate"></div>
      <div id="rate-last-updated"></div>
      <div id="rate-source"></div>

      <input id="savings-amount" />
      <input id="savings-months" />

      <button id="calculate-projection">
        Calculate
      </button>

      <div id="projected-savings"></div>
      <div id="projection-note"></div>
    `;

    window.currentPrimeRate = undefined;
    window.currentRepoRate = undefined;
  });

  // =====================================================
  // calculateProjectedSavings
  // =====================================================

  test('calculates projected savings correctly', () => {
    const result =
      calculateProjectedSavings(1000, 12, 10);

    expect(result).toBeGreaterThan(12000);
  });

  test('returns 0 when contribution is 0', () => {
    const result =
      calculateProjectedSavings(0, 12, 10);

    expect(result).toBe(0);
  });

  test('returns 0 when months is 0', () => {
    const result =
      calculateProjectedSavings(1000, 0, 10);

    expect(result).toBe(0);
  });

  // =====================================================
  // Live rates fetch
  // =====================================================

  test('loads and displays live rates successfully', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 11.25,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    expect(document.getElementById('prime-rate').textContent)
      .toContain('11.25%');

    expect(document.getElementById('repo-rate').textContent)
      .toContain('7.5%');

    expect(document.getElementById('rate-source').textContent)
      .toContain('SARB');

    expect(window.currentPrimeRate)
      .toBe(11.25);

    expect(window.currentRepoRate)
      .toBe(7.5);
  });

  test('falls back to cached rates if fetch fails', async () => {
    console.warn = jest.fn();

    getLatestInterestRates.mockRejectedValue(
      new Error('Fetch failed')
    );

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    expect(console.warn)
      .toHaveBeenCalled();

    expect(document.getElementById('prime-rate').textContent)
      .toContain('10.25%');

    expect(document.getElementById('repo-rate').textContent)
      .toContain('6.75%');

    expect(document.getElementById('rate-source').textContent)
      .toContain('cached');
  });

  // =====================================================
  // Calculator
  // =====================================================

  test('runs calculator and updates projection result', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    document.getElementById('savings-amount').value =
      '1000';

    document.getElementById('savings-months').value =
      '12';

    document
      .getElementById('calculate-projection')
      .click();

    expect(document.getElementById('projected-savings').textContent)
      .not.toBe('R 0.00');

    expect(document.getElementById('projection-note').textContent)
      .toContain('10%');
  });

  test('handles invalid calculator inputs', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    document.getElementById('savings-amount').value =
      '-1';

    document.getElementById('savings-months').value =
      '12';

    document
      .getElementById('calculate-projection')
      .click();

    expect(document.getElementById('projected-savings').textContent)
      .toBe('R 0.00');
  });

  test('handles NaN calculator values', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    document.getElementById('savings-amount').value =
      'abc';

    document.getElementById('savings-months').value =
      'xyz';

    document
      .getElementById('calculate-projection')
      .click();

    expect(document.getElementById('projected-savings').textContent)
      .toBe('R 0.00');
  });

  // =====================================================
  // Live input listeners
  // =====================================================

  test('updates calculation on amount input change', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    const amountEl =
      document.getElementById('savings-amount');

    const monthsEl =
      document.getElementById('savings-months');

    amountEl.value = '500';
    monthsEl.value = '6';

    amountEl.dispatchEvent(new Event('input'));

    expect(document.getElementById('projected-savings').textContent)
      .not.toBe('R 0.00');
  });

  test('updates calculation on months input change', async () => {
    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    await Promise.resolve();

    const amountEl =
      document.getElementById('savings-amount');

    const monthsEl =
      document.getElementById('savings-months');

    amountEl.value = '500';
    monthsEl.value = '6';

    monthsEl.dispatchEvent(new Event('input'));

    expect(document.getElementById('projected-savings').textContent)
      .not.toBe('R 0.00');
  });

  // =====================================================
  // Missing DOM elements
  // =====================================================

  test('does not crash if calculator elements are missing', async () => {
    document.body.innerHTML = '';

    getLatestInterestRates.mockResolvedValue({
      repo_rate: 7.5,
      prime_rate: 10,
      fetched_at: '2026-05-01',
      source: 'SARB'
    });

    jest.resetModules();

    await expect(
      import('../interest-rates.js')
    ).resolves.not.toThrow();
  });

  test('shows loading state initially', async () => {
    getLatestInterestRates.mockImplementation(
      () => new Promise(() => {})
    );

    jest.resetModules();

    import('../interest-rates.js');

    document.dispatchEvent(
      new Event('DOMContentLoaded')
    );

    expect(document.getElementById('prime-rate').textContent)
      .toBe('...');

    expect(document.getElementById('repo-rate').textContent)
      .toBe('...');
  });

});
