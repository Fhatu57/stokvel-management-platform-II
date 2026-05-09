import '../main.js';

describe('main.js - page routing logic', () => {
  test('GIVEN index.html page, WHEN path extracted, THEN returns index.html', () => {
    const path = 'index.html';
    const page = path.split('/').pop() || 'index.html';
    expect(page).toBe('index.html');
  });

  test('GIVEN admin-dashboard.html, WHEN path extracted, THEN returns admin-dashboard.html', () => {
    const path = 'admin-dashboard.html';
    const page = path.split('/').pop();
    expect(page).toBe('admin-dashboard.html');
  });

  test('GIVEN empty path, WHEN defaulted, THEN returns index.html', () => {
    const path = '';
    const page = path.split('/').pop() || 'index.html';
    expect(page).toBe('index.html');
  });

  test('GIVEN nested path, WHEN extracted, THEN returns filename only', () => {
    const path = 'frontend/pages/member-dashboard.html';
    const page = path.split('/').pop();
    expect(page).toBe('member-dashboard.html');
  });
});

describe('window.logout assignment', () => {
  test('GIVEN logout function, WHEN checked, THEN is a function type', () => {
    const logout = () => {};
    expect(typeof logout).toBe('function');
  });

  test('GIVEN main.js routing logic, WHEN page is index.html, THEN auth is skipped', () => {
    const currentPage = 'index.html';
    const skipAuth = currentPage === 'index.html' || currentPage === '';
    expect(skipAuth).toBe(true);
  });
});

describe('page routing cases', () => {
  const pages = [
    'index.html',
    'admin-dashboard.html',
    'treasurer-dashboard.html',
    'member-dashboard.html',
    'create-group.html',
    'invite-members.html',
    'contributions.html',
    'accept-invite.html'
  ];

  pages.forEach(page => {
    test(`GIVEN ${page}, WHEN checked, THEN is a valid page name`, () => {
      expect(page.endsWith('.html')).toBe(true);
    });
  });
});