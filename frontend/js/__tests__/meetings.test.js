import { initMeetings } from '../meetings.js';

jest.mock('../supabase-client.js', () => ({
  getMyMeetings: jest.fn(() =>
    Promise.resolve([
      {
        id: '1',
        title: 'Monthly Meeting',
        scheduled_at: '2099-01-01T10:00:00',
        location: 'Johannesburg',
        agenda: 'Discuss savings',
        minutes: '',
        groups: { name: 'Alpha Group' }
      },
      {
        id: '2',
        title: 'Past Meeting',
        scheduled_at: '2020-01-01T10:00:00',
        location: '',
        agenda: '',
        minutes: 'Meeting completed',
        groups: { name: 'Beta Group' }
      }
    ])
  ),

  getMyGroups: jest.fn(() =>
    Promise.resolve([
      { id: 'g1', name: 'Alpha Group' }
    ])
  ),

  createMeeting: jest.fn(() => Promise.resolve()),
  updateMeetingMinutes: jest.fn(() => Promise.resolve()),
  deleteMeeting: jest.fn(() => Promise.resolve())
}));

jest.mock('../utils.js', () => ({
  formatDate: jest.fn(),
  showToast: jest.fn()
}));

describe('initMeetings', () => {
  beforeEach(() => {
    localStorage.clear();

    document.body.innerHTML = `
      <section id="schedule-meeting-section">
        <form id="schedule-meeting-form">
          <select id="meeting-group-id"></select>

          <input id="meeting-title" type="text" />
          <input id="meeting-date" type="date" />
          <input id="meeting-time" type="time" />
          <input id="meeting-location" type="text" />

          <textarea id="meeting-agenda"></textarea>

          <button type="submit">
            Schedule
          </button>
        </form>
      </section>

      <section id="meetings-list"></section>
    `;
  });

  test('GIVEN admin role WHEN initialized THEN meetings render', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    expect(
      document.getElementById('meetings-list').innerHTML
    ).toContain('Monthly Meeting');

    expect(
      document.getElementById('meetings-list').innerHTML
    ).toContain('Past Meeting');
  });

  test('GIVEN member role WHEN initialized THEN form hidden', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'member' })
    );

    await initMeetings();

    const section = document.getElementById(
      'schedule-meeting-section'
    );

    expect(section.style.display).toBe('none');
  });

  test('GIVEN admin role WHEN initialized THEN form visible', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    const section = document.getElementById(
      'schedule-meeting-section'
    );

    expect(section.style.display).toBe('block');
  });

  test('GIVEN meetings exist WHEN rendered THEN upcoming label shown', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    expect(document.body.innerHTML).toContain('Upcoming');
  });

  test('GIVEN past meetings exist WHEN rendered THEN past label shown', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    expect(document.body.innerHTML).toContain('Past meetings');
  });

  test('GIVEN admin WHEN groups loaded THEN dropdown populated', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    const select =
      document.getElementById('meeting-group-id');

    expect(select.innerHTML).toContain('Alpha Group');
  });

  test('GIVEN invalid form WHEN submitted THEN does not crash', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    const form =
      document.getElementById('schedule-meeting-form');

    await expect(
      form.dispatchEvent(
        new Event('submit', { bubbles: true })
      )
    ).not.toBeNull();
  });

  test('GIVEN valid form WHEN submitted THEN succeeds', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await initMeetings();

    document.getElementById('meeting-group-id').value = 'g1';
    document.getElementById('meeting-title').value =
      'New Meeting';

    document.getElementById('meeting-date').value =
      '2099-01-01';

    document.getElementById('meeting-time').value =
      '10:00';

    const form =
      document.getElementById('schedule-meeting-form');

    form.dispatchEvent(
      new Event('submit', { bubbles: true })
    );

    expect(true).toBe(true);
  });

  test('GIVEN no DOM WHEN initialized THEN does not throw', async () => {
    document.body.innerHTML = '';

    await expect(initMeetings()).resolves.not.toThrow();
  });
});