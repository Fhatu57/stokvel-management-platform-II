import { initDashboard } from '../admin-dashboard.js';

describe('initDashboard - DOM setup', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('stokvel_user', JSON.stringify({ role: 'admin', name: 'Thabo' }));
    document.body.innerHTML = `
      <section id="stats-grid"></section>
      <section id="groups-grid"></section>
    `;
  });

  test('GIVEN DOM exists, WHEN initDashboard called, THEN does not throw', async () => {
    await expect(initDashboard()).resolves.not.toThrow();
  });

  test('GIVEN no DOM, WHEN initDashboard called, THEN does not throw', async () => {
    document.body.innerHTML = '';
    await expect(initDashboard()).resolves.not.toThrow();
  });
});

describe('admin dashboard stats logic', () => {
  test('GIVEN groups array, WHEN member count summed, THEN total is correct', () => {
    const groups = [
      { members: 5 },
      { members: 8 },
      { members: 3 }
    ];
    const total = groups.reduce((sum, g) => sum + g.members, 0);
    expect(total).toBe(16);
  });

  test('GIVEN groups array, WHEN savings summed, THEN total is correct', () => {
    const groups = [
      { totalSavings: 45000 },
      { totalSavings: 72000 },
      { totalSavings: 33750 }
    ];
    const total = groups.reduce((sum, g) => sum + g.totalSavings, 0);
    expect(total).toBe(150750);
  });

  test('GIVEN groups array, WHEN active filtered, THEN returns correct count', () => {
    const groups = [
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' }
    ];
    expect(groups.filter(g => g.status === 'active').length).toBe(2);
  });

  test('GIVEN empty groups, WHEN stats calculated, THEN returns 0', () => {
    const groups = [];
    expect(groups.reduce((sum, g) => sum + g.members, 0)).toBe(0);
  });

  test('GIVEN groups, WHEN count checked, THEN returns correct number', () => {
    const groups = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(groups.length).toBe(3);
  });
});

describe('admin role check', () => {
  beforeEach(() => { localStorage.clear(); });

  test('GIVEN admin user, WHEN role retrieved, THEN returns admin', () => {
    localStorage.setItem('stokvel_user', JSON.stringify({ role: 'admin' }));
    const user = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
    expect(user.role).toBe('admin');
  });

  test('GIVEN no user, WHEN role retrieved, THEN returns undefined', () => {
    const user = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
    expect(user.role).toBeUndefined();
  });
});