import {
  escHtml,
  capitalize,
  getRole,
  getUserId,
  initPayouts
} from '../payouts.js';

jest.mock('../supabase-client.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ user_id: 'u1' }, { user_id: 'u2' }],
        error: null
      }),
      in: jest.fn().mockResolvedValue({
        data: [
          { id: 'u1', full_name: 'Thabo' },
          { id: 'u2', full_name: 'Lerato' }
        ]
      })
    }))
  },

  getMyGroups: jest.fn(),
  getPayoutSchedule: jest.fn(),
  savePayoutSchedule: jest.fn(),
  markPayoutPaid: jest.fn()
}));

jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn(v => `R${v}`),
  formatDate: jest.fn(v => v),
  showToast: jest.fn()
}));

import {
  getMyGroups,
  getPayoutSchedule,
  savePayoutSchedule,
  markPayoutPaid
} from '../supabase-client.js';

global.confirm = jest.fn(() => true);

describe('escHtml (real)', () => {
  test('escapes special chars', () => {
    expect(escHtml('<div>"test"&</div>'))
      .toBe('&lt;div&gt;&quot;test&quot;&amp;&lt;/div&gt;');
  });

  test('handles null', () => {
    expect(escHtml(null)).toBe('');
  });
});

describe('capitalize (real)', () => {
  test('capitalizes', () => {
    expect(capitalize('pending')).toBe('Pending');
  });

  test('empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('getRole (real)', () => {
  beforeEach(() => localStorage.clear());

  test('default role', () => {
    expect(getRole()).toBe('member');
  });

  test('admin role', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    expect(getRole()).toBe('admin');
  });

  test('bad JSON fallback', () => {
    localStorage.setItem('stokvel_user', 'bad-json');
    expect(getRole()).toBe('member');
  });
});

describe('getUserId (real)', () => {
  beforeEach(() => localStorage.clear());

  test('returns user id', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ id: 'user-123' })
    );

    expect(getUserId()).toBe('user-123');
  });

  test('returns null on bad JSON', () => {
    localStorage.setItem('stokvel_user', 'bad-json');
    expect(getUserId()).toBe(null);
  });
});

describe('initPayouts', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="payout-editor-section"></section>
      <select id="payout-group-select"></select>
      <section id="payout-schedule-list"></section>
      <ul id="payout-order-list"></ul>
      <button id="save-payout-order-btn"></button>
    `;

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'admin',
        id: 'u1'
      })
    );
  });

  test('loads groups into selector', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 'g1',
        name: 'Group One',
        contribution_amount: 500
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initPayouts();

    const select = document.getElementById('payout-group-select');

    expect(select.innerHTML).toContain('Group One');
  });

  test('renders payout schedule', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 'g1',
        name: 'Group One',
        contribution_amount: 500
      }
    ]);

    getPayoutSchedule.mockResolvedValue([
      {
        id: 'p1',
        user_id: 'u1',
        position: 1,
        status: 'pending',
        amount: 500,
        scheduled_date: '2026-01-01',
        profiles: { full_name: 'Thabo' }
      }
    ]);

    await initPayouts();

    const container =
      document.getElementById('payout-schedule-list');

    expect(container.innerHTML).toContain('Thabo');
    expect(container.innerHTML).toContain('Pending');
  });

  test('renders empty payout state', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 'g1',
        name: 'Group One',
        contribution_amount: 500
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initPayouts();

    expect(
      document.body.innerHTML
    ).toContain('No payout schedule set');
  });

  test('save payout order button works', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 'g1',
        name: 'Group One',
        contribution_amount: 500
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    savePayoutSchedule.mockResolvedValue();

    await initPayouts();

    const btn =
      document.getElementById('save-payout-order-btn');

    await btn.onclick();

    expect(savePayoutSchedule).toHaveBeenCalled();
  });

  test('mark paid works', async () => {
    markPayoutPaid.mockResolvedValue();

    await window.markPaid('p1', 'g1', 500);

    expect(markPayoutPaid).toHaveBeenCalledWith('p1');
  });
});