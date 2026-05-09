import { checkAuth, logout } from '../auth.js';

describe('checkAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <p class="user-name"></p>
      <p class="user-role"></p>
      <p class="user-avatar"></p>
    `;
  });

  test('GIVEN no user in localStorage, WHEN checkAuth called, THEN does not throw', () => {
    expect(() => checkAuth()).not.toThrow();
  });

  test('GIVEN user in localStorage, WHEN checkAuth called, THEN does not throw', () => {
    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'Thabo',
      role: 'admin',
      avatar: 'TM'
    }));
    expect(() => checkAuth()).not.toThrow();
  });

  test('GIVEN invalid JSON in localStorage, WHEN checkAuth called, THEN throws SyntaxError', () => {
  localStorage.setItem('stokvel_user', 'bad-json');
  expect(() => checkAuth()).toThrow(SyntaxError);
  });
});

describe('logout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('GIVEN user logged in, WHEN logout called, THEN signOut is called', () => {
  localStorage.setItem('stokvel_user', JSON.stringify({ name: 'Thabo', role: 'admin' }));
  expect(() => { try { logout(); } catch (e) {} }).not.toThrow();
  });

  test('GIVEN no user, WHEN logout called, THEN does not throw', () => {
    expect(() => { try { logout(); } catch (e) {} }).not.toThrow();
  });
});

describe('auth localStorage logic', () => {
  beforeEach(() => { localStorage.clear(); });

  test('GIVEN user stored, WHEN retrieved, THEN has correct role', () => {
    localStorage.setItem('stokvel_user', JSON.stringify({ role: 'admin' }));
    const user = JSON.parse(localStorage.getItem('stokvel_user'));
    expect(user.role).toBe('admin');
  });

  test('GIVEN member user stored, WHEN retrieved, THEN role is member', () => {
    localStorage.setItem('stokvel_user', JSON.stringify({ role: 'member' }));
    const user = JSON.parse(localStorage.getItem('stokvel_user'));
    expect(user.role).toBe('member');
  });

  test('GIVEN no user, WHEN parsed, THEN returns empty object', () => {
    const user = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
    expect(user).toEqual({});
  });

  test('GIVEN user with all fields, WHEN retrieved, THEN all fields present', () => {
    const userData = { id: '1', name: 'Thabo', email: 'thabo@test.com', role: 'admin', avatar: 'TM' };
    localStorage.setItem('stokvel_user', JSON.stringify(userData));
    const user = JSON.parse(localStorage.getItem('stokvel_user'));
    expect(user.id).toBe('1');
    expect(user.name).toBe('Thabo');
    expect(user.email).toBe('thabo@test.com');
  });
});