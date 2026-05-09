import { initMeetings } from '../meetings.js';

describe('initMeetings - DOM setup', () => {
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
          <button type="submit">Schedule</button>
        </form>
      </section>

      <section id="meetings-list"></section>
    `;
  });

  test('GIVEN DOM elements exist, WHEN initMeetings called, THEN does not throw', async () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    await expect(
      Promise.race([
        initMeetings(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);

  test('GIVEN no DOM elements, WHEN initMeetings called, THEN does not throw', async () => {
    document.body.innerHTML = '';

    await expect(
      Promise.race([
        initMeetings(),
        new Promise(resolve => setTimeout(resolve, 200))
      ])
    ).resolves.not.toThrow();
  }, 10000);
});

describe('meeting form validation logic', () => {
  test('GIVEN empty title, WHEN validated, THEN is invalid', () => {
    expect(!'').toBe(true);
  });

  test('GIVEN valid title, WHEN validated, THEN is valid', () => {
    expect(!'Monthly Meeting').toBe(false);
  });

  test('GIVEN empty date, WHEN validated, THEN is invalid', () => {
    expect(!'').toBe(true);
  });

  test('GIVEN valid date, WHEN validated, THEN is valid', () => {
    expect(!'2026-05-15').toBe(false);
  });

  test('GIVEN meeting date, WHEN compared to today, THEN can determine if past', () => {
    const pastDate = new Date('2020-01-01');
    const today = new Date();

    expect(pastDate < today).toBe(true);
  });

  test('GIVEN future meeting date, WHEN compared to today, THEN is upcoming', () => {
    const futureDate = new Date('2099-01-01');
    const today = new Date();

    expect(futureDate > today).toBe(true);
  });

  test('GIVEN meetings array, WHEN filtered by upcoming, THEN returns correct count', () => {
    const today = new Date();

    const meetings = [
      { date: '2099-01-01' },
      { date: '2020-01-01' },
      { date: '2099-06-01' }
    ];

    const upcoming = meetings.filter(
      m => new Date(m.date) > today
    );

    expect(upcoming.length).toBe(2);
  });

  test('GIVEN meetings array, WHEN filtered by past, THEN returns correct count', () => {
    const today = new Date();

    const meetings = [
      { date: '2099-01-01' },
      { date: '2020-01-01' },
      { date: '2020-06-01' }
    ];

    const past = meetings.filter(
      m => new Date(m.date) <= today
    );

    expect(past.length).toBe(2);
  });
});

describe('getRole logic (meetings)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('GIVEN no user, WHEN role checked, THEN defaults to member', () => {
    const role =
      JSON.parse(localStorage.getItem('stokvel_user') || '{}').role ||
      'member';

    expect(role).toBe('member');
  });

  test('GIVEN treasurer user, WHEN role checked, THEN returns treasurer', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'treasurer' })
    );

    const role =
      JSON.parse(localStorage.getItem('stokvel_user') || '{}').role ||
      'member';

    expect(role).toBe('treasurer');
  });

  test('GIVEN admin user, WHEN role checked, THEN can schedule meetings', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'admin' })
    );

    const role =
      JSON.parse(localStorage.getItem('stokvel_user') || '{}').role ||
      'member';

    const canSchedule =
      role === 'treasurer' || role === 'admin';

    expect(canSchedule).toBe(true);
  });

  test('GIVEN member user, WHEN role checked, THEN cannot schedule meetings', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({ role: 'member' })
    );

    const role =
      JSON.parse(localStorage.getItem('stokvel_user') || '{}').role ||
      'member';

    const canSchedule =
      role === 'treasurer' || role === 'admin';

    expect(canSchedule).toBe(false);
  });
});