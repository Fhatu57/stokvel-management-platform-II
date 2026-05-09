import {
  escHtml,
  capitalize,
  getRole,
  getUserName,
  getUserEmail,
  initContributions
} from '../contributions.js';

jest.mock('../supabase-client.js', () => ({
  getMyContributions: jest.fn(),
  getAllContributions: jest.fn(),
  updateContributionStatus: jest.fn()
}));

jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn(v => `R${v}`),
  formatDate: jest.fn(v => v),
  showToast: jest.fn()
}));

import {
  getMyContributions,
  getAllContributions,
  updateContributionStatus
} from '../supabase-client.js';

describe('helpers', () => {
  beforeEach(() => localStorage.clear());

  test('escHtml escapes correctly', () => {
    expect(escHtml('<div>"test"&</div>'))
      .toBe('&lt;div&gt;&quot;test&quot;&amp;&lt;/div&gt;');
  });

  test('capitalize works', () => {
    expect(capitalize('pending')).toBe('Pending');
  });

  test('getRole default', () => {
    expect(getRole()).toBe('member');
  });

  test('getRole admin', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    expect(getRole()).toBe('admin');
  });

  test('getUserName returns name', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ name: 'Lucky Mokoena' })
    );

    expect(getUserName()).toBe('Lucky Mokoena');
  });

  test('getUserEmail returns email', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ email: 'lucky@test.com' })
    );

    expect(getUserEmail()).toBe('lucky@test.com');
  });
});

describe('initContributions member flow', () => {
  beforeEach(() => {
    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'member',
        name: 'Lucky Mokoena',
        email: 'lucky@test.com'
      })
    );

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
        <option value="pending">Pending</option>
      </select>
    `;
  });

  test('loads member contributions', async () => {
    getMyContributions.mockResolvedValue([
      {
        id: 'c1',
        due_date: '2026-01-01',
        groups: { name: 'Family Group' },
        profiles: { full_name: 'Lucky' },
        amount: 500,
        status: 'pending'
      }
    ]);

    await initContributions();

    expect(
      document.getElementById('contributions-table-body').innerHTML
    ).toContain('Family Group');
  });

  test('updates totals', async () => {
    getMyContributions.mockResolvedValue([
      {
        id: 'c1',
        due_date: '2026-01-01',
        groups: { name: 'Family Group' },
        profiles: { full_name: 'Lucky' },
        amount: 500,
        status: 'pending'
      }
    ]);

    await initContributions();

    expect(
      document.getElementById('contribution-count').textContent
    ).toBe('1');

    expect(
      document.getElementById('pending-count').textContent
    ).toBe('1');
  });
});

describe('initContributions treasurer flow', () => {
  beforeEach(() => {
    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'admin'
      })
    );

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

      <select id="contribution-filter"></select>
    `;
  });

  test('loads all contributions', async () => {
    getAllContributions.mockResolvedValue([
      {
        id: 'c1',
        due_date: '2026-01-01',
        groups: { name: 'Admin Group' },
        profiles: { full_name: 'Thabo' },
        amount: 1000,
        status: 'completed'
      }
    ]);

    await initContributions();

    expect(
      document.getElementById('contributions-header-row').innerHTML
    ).toContain('Actions');
  });
});

describe('error handling', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table>
        <tbody id="contributions-table-body"></tbody>
      </table>
    `;
  });

  test('handles fetch failure', async () => {
    getMyContributions.mockRejectedValue(
      new Error('Database failed')
    );

    await initContributions();

    expect(
      document.getElementById('contributions-table-body').innerHTML
    ).toContain('Could not load contributions');
  });
});

describe('PayFast flow', () => {
  beforeEach(() => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'Lucky Mokoena',
        email: 'lucky@test.com'
      })
    );
  });

  test('creates PayFast form', () => {
    const submitMock = jest.fn();

    const originalCreate = document.createElement.bind(document);

    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);

      if (tag === 'form') {
        el.submit = submitMock;
      }

      return el;
    });

    window.payWithPayFast('c1', 500, 'Family Group');

    expect(submitMock).toHaveBeenCalled();
  });
});

describe('treasurer actions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="contribution-filter">
        <option value="all">All</option>
      </select>
      <table>
        <tbody id="contributions-table-body"></tbody>
      </table>
    `;

    window._contributionRows = [
      {
        id: 'c1',
        status: 'pending',
        member: 'Lucky',
        amount: 500,
        group: 'Family Group',
        date: '2026-01-01'
      }
    ];
  });

  test('confirmContribution updates status', async () => {
    updateContributionStatus.mockResolvedValue();

    await window.confirmContribution('c1', 'Lucky');

    expect(updateContributionStatus)
      .toHaveBeenCalledWith('c1', 'completed');
  });

  test('flagMissed updates status', async () => {
    updateContributionStatus.mockResolvedValue();

    await window.flagMissed('c1');

    expect(updateContributionStatus)
      .toHaveBeenCalledWith('c1', 'missed');
  });
});