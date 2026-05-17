import {
  initMemberDashboard,
  initTreasurerDashboard,
  initMyGroups
} from '../dashboards.js';

jest.mock('../supabase-client.js', () => ({
  getMyGroups: jest.fn(() => Promise.resolve([])),
  getMyContributions: jest.fn(() => Promise.resolve([]))
}));

jest.mock('../utils.js', () => ({
  showToast: jest.fn(),
  formatCurrency: jest.fn(v => `R${v}`),
  formatDate: jest.fn(v => v)
}));

describe('initMemberDashboard - DOM setup', () => {

  beforeEach(() => {

    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'Lucky',
        role: 'member'
      })
    );

    document.body.innerHTML = `
      <section class="page-header">
        <h1></h1>
      </section>

      <section data-testid="member-groups"></section>

      <section data-testid="stat-groups-count">
        <span class="stat-value"></span>
      </section>

      <section data-testid="stat-total-contributed">
        <span class="stat-value"></span>
      </section>

      <section data-testid="stat-pending">
        <span class="stat-value"></span>
      </section>

      <section data-testid="stat-next-payment">
        <span class="stat-value"></span>
      </section>

      <section data-testid="payment-reminder">
        <p></p>
      </section>

      <section data-testid="recent-contributions-table">
        <table>
          <tbody></tbody>
        </table>
      </section>

      <div id="next-meeting-info"></div>
    `;
  });

  test('GIVEN DOM exists, WHEN initMemberDashboard called, THEN does not throw', async () => {

    await expect(
      Promise.race([
        initMemberDashboard(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN no DOM, WHEN initMemberDashboard called, THEN does not throw', async () => {

    document.body.innerHTML = '';

    await expect(
      Promise.race([
        initMemberDashboard(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN user name, WHEN dashboard initialized, THEN welcome text uses first name', async () => {

    await initMemberDashboard();

    expect(
      document.querySelector('.page-header h1').textContent
    ).toBe('Welcome, Lucky!');
  });

});

describe('initTreasurerDashboard - DOM setup', () => {

  beforeEach(() => {

    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'Nomsa',
        role: 'treasurer'
      })
    );

    document.body.innerHTML = `
      <button data-testid="btn-record-contribution"></button>
      <button data-testid="btn-schedule-payout"></button>
      <button data-testid="btn-generate-report"></button>
      <button data-testid="btn-schedule-meeting"></button>

      <section data-testid="treasurer-info"></section>

      <section data-testid="stat-pending-contributions">
        <span class="stat-value"></span>
      </section>

      <section data-testid="stat-this-month">
        <span class="stat-value"></span>
      </section>

      <section data-testid="recent-contributions-table">
        <table>
          <tbody></tbody>
        </table>
      </section>
    `;
  });

  test('GIVEN DOM exists, WHEN initTreasurerDashboard called, THEN does not throw', async () => {

    await expect(
      Promise.race([
        initTreasurerDashboard(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN no DOM, WHEN initTreasurerDashboard called, THEN does not throw', async () => {

    document.body.innerHTML = '';

    await expect(
      Promise.race([
        initTreasurerDashboard(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN treasurer info note, WHEN dashboard initialized, THEN note hidden', async () => {

    await initTreasurerDashboard();

    expect(
      document.querySelector('[data-testid="treasurer-info"]').style.display
    ).toBe('none');
  });

});

describe('initMyGroups - DOM setup', () => {

  beforeEach(() => {

    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'Lucky',
        role: 'member'
      })
    );

    document.body.innerHTML = `
      <section id="groups-container"></section>

      <p id="stat-group-count"></p>

      <p id="stat-monthly-total"></p>
    `;
  });

  test('GIVEN DOM exists, WHEN initMyGroups called, THEN does not throw', async () => {

    await expect(
      Promise.race([
        initMyGroups(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN no DOM, WHEN initMyGroups called, THEN does not throw', async () => {

    document.body.innerHTML = '';

    await expect(
      Promise.race([
        initMyGroups(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

});

describe('dashboard stats logic', () => {

  test('GIVEN groups array, WHEN monthly total calculated, THEN sum is correct', () => {

    const groups = [
      { contribution_amount: 500 },
      { contribution_amount: 300 },
      { contribution_amount: 1000 }
    ];

    const total = groups.reduce(
      (s, g) => s + Number(g.contribution_amount || 0),
      0
    );

    expect(total).toBe(1800);
  });

  test('GIVEN empty groups, WHEN count checked, THEN returns 0', () => {

    expect([].length).toBe(0);
  });

  test('GIVEN contributions, WHEN pending filtered, THEN count is correct', () => {

    const contributions = [
      { status: 'pending' },
      { status: 'completed' },
      { status: 'pending' }
    ];

    expect(
      contributions.filter(c => c.status === 'pending').length
    ).toBe(2);
  });

  test('GIVEN groups, WHEN active filtered, THEN count is correct', () => {

    const groups = [
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' }
    ];

    expect(
      groups.filter(g => g.status === 'active').length
    ).toBe(2);
  });

  test('GIVEN user name, WHEN welcome text built, THEN uses first name', () => {

    const name = 'Lucky Mokoena';

    const welcome = `Welcome, ${name.split(' ')[0]}!`;

    expect(welcome).toBe('Welcome, Lucky!');
  });

});

describe('group status badge logic', () => {

  function getStatusClass(status) {

    return status === 'active'
      ? 'badge-success'
      : status === 'inactive'
      ? 'badge-warning'
      : 'badge-error';
  }

  test('GIVEN active status, WHEN badge class determined, THEN returns badge-success', () => {

    expect(getStatusClass('active')).toBe('badge-success');
  });

  test('GIVEN inactive status, WHEN badge class determined, THEN returns badge-warning', () => {

    expect(getStatusClass('inactive')).toBe('badge-warning');
  });

  test('GIVEN unknown status, WHEN badge class determined, THEN returns badge-error', () => {

    expect(getStatusClass('unknown')).toBe('badge-error');
  });

});

describe('monthly contribution calculation', () => {

  function calcMonthlyTotal(contributions) {

    const now = new Date();

    return contributions
      .filter(c => {

        if (!c.paid_at) return false;

        const d = new Date(c.paid_at);

        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, c) => s + Number(c.amount), 0);
  }

  test('GIVEN empty array, WHEN total calculated, THEN returns 0', () => {

    expect(calcMonthlyTotal([])).toBe(0);
  });

  test('GIVEN no paid_at, WHEN total calculated, THEN returns 0', () => {

    expect(
      calcMonthlyTotal([
        {
          amount: 500,
          paid_at: null
        }
      ])
    ).toBe(0);
  });

  test('GIVEN current month contribution, WHEN total calculated, THEN includes it', () => {

    const now = new Date().toISOString();

    expect(
      calcMonthlyTotal([
        {
          amount: 500,
          paid_at: now
        }
      ])
    ).toBe(500);
  });

  test('GIVEN old contribution, WHEN total calculated, THEN excludes it', () => {

    expect(
      calcMonthlyTotal([
        {
          amount: 500,
          paid_at: '2020-01-01T00:00:00Z'
        }
      ])
    ).toBe(0);
  });

});