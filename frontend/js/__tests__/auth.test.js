import { checkAuth, logout } from '../auth.js';

jest.mock('../supabase-client.js', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChange: jest.fn(),
  acceptInvitation: jest.fn()
}));

import { signOut } from '../supabase-client.js';

describe('checkAuth', () => {

  beforeEach(() => {

    localStorage.clear();

    document.body.innerHTML = `
      <div class="user-name"></div>
      <div class="user-role"></div>
      <div class="user-avatar"></div>

      <aside class="sidebar-nav">
        <div class="nav-section"></div>
      </aside>
    `;
  });

  test('GIVEN no user in localStorage, WHEN checkAuth called, THEN does not throw', () => {

    expect(() => checkAuth()).not.toThrow();
  });

  test('GIVEN user in localStorage, WHEN checkAuth called, THEN sidebar info rendered', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'Thabo',
      role: 'admin',
      avatar: 'TM',
      email: 'thabo@test.com'
    }));

    checkAuth();

    expect(document.querySelector('.user-name').textContent)
      .toBe('Thabo');

    expect(document.querySelector('.user-role').textContent)
      .toBe('Admin');

    expect(document.querySelector('.user-avatar').textContent)
      .toBe('TM');
  });

  test('GIVEN invalid JSON in localStorage, WHEN checkAuth called, THEN throws SyntaxError', () => {

    localStorage.setItem('stokvel_user', 'bad-json');

    expect(() => checkAuth()).toThrow(SyntaxError);
  });

  test('GIVEN admin user, WHEN checkAuth called, THEN admin nav links rendered', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'admin'
    }));

    checkAuth();

    expect(document.body.innerHTML)
      .toContain('Create Group');

    expect(document.body.innerHTML)
      .toContain('Analytics');

    expect(document.body.innerHTML)
      .toContain('Meetings');
  });

  test('GIVEN treasurer user, WHEN checkAuth called, THEN treasurer nav rendered', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'treasurer'
    }));

    checkAuth();

    expect(document.body.innerHTML)
      .toContain('My Groups');

    expect(document.body.innerHTML)
      .toContain('Payouts');
  });

  test('GIVEN member user, WHEN checkAuth called, THEN member nav rendered', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'member'
    }));

    checkAuth();

    expect(document.body.innerHTML)
      .toContain('My Contributions');

    expect(document.body.innerHTML)
      .toContain('Payout Schedule');
  });

  test('GIVEN unknown role, WHEN checkAuth called, THEN defaults to member nav', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'weird-role'
    }));

    checkAuth();

    expect(document.body.innerHTML)
      .toContain('My Contributions');
  });

  test('GIVEN missing nav section, WHEN checkAuth called, THEN does not throw', () => {

    document.body.innerHTML = `
      <div class="user-name"></div>
    `;

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'admin'
    }));

    expect(() => checkAuth()).not.toThrow();
  });

  test('GIVEN user with email only, WHEN checkAuth called, THEN email displayed', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      email: 'user@test.com',
      role: 'member'
    }));

    checkAuth();

    expect(document.querySelector('.user-name').textContent)
      .toBe('user@test.com');
  });

  test('GIVEN user without avatar, WHEN checkAuth called, THEN fallback avatar used', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'John',
      role: 'member'
    }));

    checkAuth();

    expect(document.querySelector('.user-avatar').textContent)
      .toBe('?');
  });

});

describe('logout', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  test('GIVEN user logged in, WHEN logout called, THEN signOut is called', async () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'Thabo',
      role: 'admin'
    }));

    logout();

    await Promise.resolve();

    expect(signOut).toHaveBeenCalled();
  });

  test('GIVEN user logged in, WHEN logout called, THEN localStorage cleared', async () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'Thabo'
    }));

    logout();

    await Promise.resolve();

    expect(localStorage.getItem('stokvel_user'))
      .toBeNull();
  });

  test('GIVEN no user, WHEN logout called, THEN does not throw', () => {

    expect(() => logout()).not.toThrow();
  });

});

describe('auth localStorage logic', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  test('GIVEN user stored, WHEN retrieved, THEN has correct role', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'admin'
    }));

    const user = JSON.parse(localStorage.getItem('stokvel_user'));

    expect(user.role).toBe('admin');
  });

  test('GIVEN member user stored, WHEN retrieved, THEN role is member', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'member'
    }));

    const user = JSON.parse(localStorage.getItem('stokvel_user'));

    expect(user.role).toBe('member');
  });

  test('GIVEN no user, WHEN parsed, THEN returns empty object', () => {

    const user = JSON.parse(
      localStorage.getItem('stokvel_user') || '{}'
    );

    expect(user).toEqual({});
  });

  test('GIVEN user with all fields, WHEN retrieved, THEN all fields present', () => {

    const userData = {
      id: '1',
      name: 'Thabo',
      email: 'thabo@test.com',
      role: 'admin',
      avatar: 'TM'
    };

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify(userData)
    );

    const user = JSON.parse(
      localStorage.getItem('stokvel_user')
    );

    expect(user.id).toBe('1');

    expect(user.name).toBe('Thabo');

    expect(user.email).toBe('thabo@test.com');
  });

});

describe('capitalize fallback behavior', () => {

  test('GIVEN user role missing, WHEN checkAuth called, THEN defaults to Member', () => {

    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'John'
    }));

    document.body.innerHTML = `
      <div class="user-name"></div>
      <div class="user-role"></div>
      <div class="user-avatar"></div>

      <aside class="sidebar-nav">
        <div class="nav-section"></div>
      </aside>
    `;

    checkAuth();

    expect(document.querySelector('.user-role').textContent)
      .toBe('Member');
  });

});

describe('navigation active link logic', () => {

  test('GIVEN current page matches nav link, WHEN checkAuth called, THEN active class applied', () => {

    delete window.location;

    window.location = {
      pathname: '/admin-dashboard.html',
      href: ''
    };

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'admin'
    }));

    document.body.innerHTML = `
      <div class="user-name"></div>
      <div class="user-role"></div>
      <div class="user-avatar"></div>

      <aside class="sidebar-nav">
        <div class="nav-section"></div>
      </aside>
    `;

    checkAuth();

    expect(document.querySelector('.nav-link.active'))
      .not.toBeNull();
  });

});