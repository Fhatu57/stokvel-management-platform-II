import { initDashboard } from '../admin-dashboard.js';

jest.mock('../supabase-client.js', () => ({
  getMyGroups: jest.fn(),
  supabase: {
    from: jest.fn()
  }
}));

import { getMyGroups, supabase } from '../supabase-client.js';

describe('admin-dashboard rendering', () => {

  beforeEach(() => {
    document.body.innerHTML = `
      <section id="groups-grid"></section>
      <section id="stats-grid"></section>
      <section id="role-management-panel"></section>
    `;

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );
  });

  test('GIVEN no groups, WHEN dashboard loads, THEN empty state is shown', async () => {

    getMyGroups.mockResolvedValue([]);

    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    await initDashboard();

    expect(
      document.getElementById('groups-grid').innerHTML
    ).toContain('No groups yet');
  });

  test('GIVEN groups exist, WHEN dashboard loads, THEN group cards render', async () => {

    getMyGroups.mockResolvedValue([
      {
        id: '1',
        name: 'Family Group',
        group_members: [{}, {}],
        contribution_amount: 500,
        frequency: 'monthly',
        status: 'active'
      }
    ]);

    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    await initDashboard();

    expect(
      document.getElementById('groups-grid').innerHTML
    ).toContain('Family Group');

    expect(
      document.getElementById('stats-grid').innerHTML
    ).toContain('Total Members');
  });

  test('GIVEN getMyGroups fails, WHEN dashboard loads, THEN error message shown', async () => {

    getMyGroups.mockRejectedValue(
      new Error('Database failed')
    );

    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    await initDashboard();

    expect(
      document.getElementById('groups-grid').innerHTML
    ).toContain('Could not load groups');
  });

  test('GIVEN members exist, WHEN role panel loads, THEN members render', async () => {

    getMyGroups.mockResolvedValue([]);

    let call = 0;

    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => {

        call++;

        if (call === 1) {
          return Promise.resolve({
            data: [
              {
                id: '1',
                full_name: 'Lucky',
                email: 'lucky@test.com'
              }
            ],
            error: null
          });
        }

        return Promise.resolve({
          data: [
            {
              user_id: '1',
              role: 'member'
            }
          ],
          error: null
        });
      })
    }));

    await initDashboard();

    expect(
      document.getElementById('role-management-panel').innerHTML
    ).toContain('Lucky');
  });

});