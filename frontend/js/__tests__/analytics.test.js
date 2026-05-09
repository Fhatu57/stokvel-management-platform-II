
import { initAnalytics, escHtml, capitalize } from '../analytics.js';
import {
  getMyGroups,
  getContributionCompliance,
  getContributionsByMonth,
  getPayoutSchedule
} from '../supabase-client.js';

// Mock Supabase
jest.mock('../supabase-client.js', () => ({
  getMyGroups: jest.fn(),
  getContributionCompliance: jest.fn(),
  getContributionsByMonth: jest.fn(),
  getPayoutSchedule: jest.fn()
}));

// Mock utils
jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn((amount) => `R${amount}`),
  formatDate: jest.fn((date) => date),
  showToast: jest.fn()
}));

describe('analytics.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <select id="analytics-group-select"></select>
      <section id="analytics-content"></section>

      <canvas id="compliance-chart"></canvas>
      <div id="compliance-no-data"></div>

      <canvas id="monthly-chart"></canvas>
      <div id="monthly-no-data"></div>

      <section id="payout-report-container"></section>
    `;

    // Mock Chart.js
    global.Chart = jest.fn(() => ({
      destroy: jest.fn()
    }));

    // Mock browser download APIs
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('utility functions', () => {
    test('escHtml escapes html characters', () => {
      expect(escHtml('A & B')).toBe('A &amp; B');
      expect(escHtml('<div>')).toBe('&lt;div&gt;');
      expect(escHtml('a > b')).toBe('a &gt; b');
    });

    test('capitalize capitalizes correctly', () => {
      expect(capitalize('pending')).toBe('Pending');
      expect(capitalize('')).toBe('');
      expect(capitalize(null)).toBe('');
    });
  });

  test('initAnalytics does not throw if selector missing', async () => {
    document.body.innerHTML = '';

    await expect(initAnalytics()).resolves.not.toThrow();
  });

  test('loads groups into selector', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getContributionCompliance.mockResolvedValue([]);
    getContributionsByMonth.mockResolvedValue([]);
    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    const select = document.getElementById('analytics-group-select');

    expect(select.innerHTML).toContain('Savings Group');
  });

  test('shows no groups message when groups empty', async () => {
    getMyGroups.mockResolvedValue([]);

    await initAnalytics();

    expect(
      document.getElementById('analytics-content').innerHTML
    ).toContain('No groups available');
  });

  test('renders compliance chart when data exists', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([
      {
        name: 'Thabo',
        compliance_pct: 80,
        late: 1,
        missed: 0
      }
    ]);

    getContributionsByMonth.mockResolvedValue([]);
    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    expect(global.Chart).toHaveBeenCalled();
  });

  test('renders monthly chart when data exists', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([]);

    getContributionsByMonth.mockResolvedValue([
      {
        month: 'Jan',
        total_amount: 5000
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    expect(global.Chart).toHaveBeenCalled();
  });

  test('renders payout table when data exists', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([]);
    getContributionsByMonth.mockResolvedValue([]);

    getPayoutSchedule.mockResolvedValue([
      {
        position: 1,
        profiles: { full_name: 'Thabo' },
        scheduled_date: '2026-01-01',
        amount: 500,
        status: 'paid'
      }
    ]);

    await initAnalytics();

    const payoutContainer = document.getElementById(
      'payout-report-container'
    );

    expect(payoutContainer.innerHTML).toContain('Thabo');
    expect(payoutContainer.innerHTML).toContain('R500');
  });

  test('renders no payout message when no payout data', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([]);
    getContributionsByMonth.mockResolvedValue([]);
    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    expect(
      document.getElementById('payout-report-container').innerHTML
    ).toContain('No payout schedule');
  });

  test('exports compliance csv', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([
      {
        name: 'Thabo',
        total: 10,
        completed: 8,
        late: 1,
        missed: 1,
        compliance_pct: 80
      }
    ]);

    getContributionsByMonth.mockResolvedValue([]);
    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    expect(() => window.exportComplianceCSV()).not.toThrow();
  });

  test('exports monthly csv', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([]);

    getContributionsByMonth.mockResolvedValue([
      {
        month: 'Jan',
        total_amount: 5000
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initAnalytics();

    expect(() => window.exportMonthlyCSV()).not.toThrow();
  });

  test('exports payout csv', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Group 1' }
    ]);

    getContributionCompliance.mockResolvedValue([]);
    getContributionsByMonth.mockResolvedValue([]);

    getPayoutSchedule.mockResolvedValue([
      {
        position: 1,
        profiles: { full_name: 'Thabo' },
        scheduled_date: '2026-01-01',
        amount: 500,
        status: 'paid'
      }
    ]);

    await initAnalytics();

    expect(() => window.exportPayoutCSV()).not.toThrow();
  });
});
