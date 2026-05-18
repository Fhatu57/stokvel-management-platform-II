/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  getMyContributions: jest.fn(),
  getAllContributions: jest.fn(),
  updateContributionStatus: jest.fn(),
  recordContribution: jest.fn(),
  getMyGroups: jest.fn(),
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() =>
          Promise.resolve({
            data: [{ user_id: '1' }]
          })
        ),
        in: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: '1',
                full_name: 'John Doe'
              }
            ]
          })
        )
      }))
    }))
  }
}));

jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn(v => `R ${v}`),
  formatDate: jest.fn(() => '2026-05-18'),
  showToast: jest.fn()
}));

import {
  getMyContributions,
  getAllContributions,
  updateContributionStatus,
  recordContribution,
  getMyGroups
} from '../supabase-client.js';

import { showToast } from '../utils.js';

import { initContributions }
from '../contributions.js';

describe('initContributions', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <table>
        <thead>
          <tr id="contributions-header-row"></tr>
        </thead>

        <tbody id="contributions-table-body"></tbody>
      </table>

      <div id="total-contributions"></div>
      <div id="contribution-count"></div>
      <div id="pending-count"></div>

      <select id="contribution-filter">
        <option value="all">All</option>
      </select>

      <div id="record-contribution-section"></div>
    `;

    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        id: '1',
        role: 'member',
        name: 'John Doe',
        email: 'john@test.com'
      })
    );

    window._contributionRows = [];
    window._isTreasurer = false;
  });

  test('loads member contributions', async () => {
    getMyContributions.mockResolvedValue([
      {
        id: '1',
        amount: 500,
        status: 'pending',
        due_date: '2026-05-20',
        groups: {
          name: 'Savings Club'
        },
        profiles: {
          full_name: 'John Doe'
        }
      }
    ]);

    await initContributions();

    expect(getMyContributions)
      .toHaveBeenCalled();
  });

  test('loads treasurer contributions', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'treasurer'
      })
    );

    getAllContributions.mockResolvedValue([]);
    getMyGroups.mockResolvedValue([]);

    await initContributions();

    expect(getAllContributions)
      .toHaveBeenCalled();
  });

  test('renders contribution rows', async () => {
    getMyContributions.mockResolvedValue([
      {
        id: '1',
        amount: 300,
        status: 'completed',
        due_date: '2026-05-20',
        groups: {
          name: 'Club'
        },
        profiles: {
          full_name: 'John Doe'
        }
      }
    ]);

    await initContributions();

    expect(
      document.getElementById(
        'contributions-table-body'
      ).innerHTML
    ).toContain('Club');
  });

  test('shows loading error', async () => {
    getMyContributions.mockRejectedValue(
      new Error('DB failed')
    );

    await initContributions();

    expect(showToast)
      .toHaveBeenCalledWith(
        'Failed to load: DB failed',
        'error'
      );
  });

  test('updates stats correctly', async () => {
    getMyContributions.mockResolvedValue([
      {
        id: '1',
        amount: 500,
        status: 'pending'
      },
      {
        id: '2',
        amount: 1000,
        status: 'completed'
      }
    ]);

    await initContributions();

    expect(
      document.getElementById(
        'contribution-count'
      ).textContent
    ).toBe('2');

    expect(
      document.getElementById(
        'pending-count'
      ).textContent
    ).toBe('1');
  });

});

describe('PayFast integration', () => {

  beforeEach(() => {
    document.body.innerHTML = '';

    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'John Doe',
        email: 'john@test.com'
      })
    );
  });

  test('stores pending payment id', () => {
    window.payWithPayFast(
      '123',
      500,
      'Savings Club'
    );

    expect(
      localStorage.getItem(
        'pending_payment_id'
      )
    ).toBe('123');
  });

  test('creates payment form', () => {
    window.payWithPayFast(
      '123',
      500,
      'Savings Club'
    );

    const form =
      document.querySelector('form');

    expect(form).not.toBeNull();

    expect(form.method.toLowerCase())
      .toBe('post');
  });

});

describe('confirmContribution', () => {

  beforeEach(() => {
    window._contributionRows = [
      {
        id: '1',
        status: 'pending'
      }
    ];

    document.body.innerHTML = `
      <select id="contribution-filter">
        <option value="all">All</option>
      </select>

      <tbody id="contributions-table-body"></tbody>
    `;
  });

  test('confirms contribution successfully', async () => {
    updateContributionStatus
      .mockResolvedValue({});

    await window.confirmContribution(
      '1',
      'John'
    );

    expect(updateContributionStatus)
      .toHaveBeenCalledWith(
        '1',
        'completed'
      );

    expect(showToast)
      .toHaveBeenCalled();
  });

  test('handles confirmation failure', async () => {
    updateContributionStatus
      .mockRejectedValue(
        new Error('Failed')
      );

    await window.confirmContribution(
      '1',
      'John'
    );

    expect(showToast)
      .toHaveBeenCalledWith(
        'Failed to confirm: Failed',
        'error'
      );
  });

});

describe('flagMissed', () => {

  test('flags contribution as missed', async () => {
    updateContributionStatus
      .mockResolvedValue({});

    await window.flagMissed('1');

    expect(updateContributionStatus)
      .toHaveBeenCalledWith(
        '1',
        'missed'
      );
  });

});

describe('loadMembersForRC', () => {

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="rc-member"></select>

      <select id="rc-group">
        <option
          data-amount="500"
          selected>
          Group
        </option>
      </select>

      <input id="rc-amount" />
    `;
  });

  test('loads members into dropdown', async () => {
    await window.loadMembersForRC('1');

    expect(
      document.getElementById(
        'rc-member'
      ).innerHTML
    ).toContain('John Doe');
  });

  test('auto fills amount', async () => {
    await window.loadMembersForRC('1');

    expect(
      document.getElementById(
        'rc-amount'
      ).value
    ).toBe('500');
  });

});