/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChange: jest.fn(),
  acceptInvitation: jest.fn(),
  isSupabaseConfigured: true
}));

jest.mock('../utils.js', () => ({
  navigateTo: jest.fn()
}));

import {
  signInWithGoogle,
  signOut,
  onAuthStateChange,
  acceptInvitation
} from '../supabase-client.js';

import {
  initLoginPage,
  checkAuth,
  logout
} from '../auth.js';
import { navigateTo } from '../utils.js';

describe('initLoginPage', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <button id="google-signin-btn">
        Sign in with Google
      </button>
    `;

    delete window.location;

    window.location = {
      href: '',
      pathname: '/index.html'
    };

    localStorage.clear();
  });

  test('attaches click listener to google button', () => {
    initLoginPage();

    const btn =
      document.getElementById('google-signin-btn');

    expect(btn).not.toBeNull();
  });

  test('calls signInWithGoogle on click', async () => {
    signInWithGoogle.mockResolvedValue({});

    initLoginPage();

    const btn =
      document.getElementById('google-signin-btn');

    btn.click();

    await Promise.resolve();

    expect(signInWithGoogle)
      .toHaveBeenCalled();
  });

  test('disables button while signing in', () => {
    signInWithGoogle.mockImplementation(
      () => new Promise(() => {})
    );

    initLoginPage();

    const btn =
      document.getElementById('google-signin-btn');

    btn.click();

    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('Signing in…');
  });

  test('handles sign in failure', async () => {
    console.error = jest.fn();

    signInWithGoogle.mockRejectedValue(
      new Error('Google failed')
    );

    initLoginPage();

    const btn =
      document.getElementById('google-signin-btn');

    btn.click();

    await Promise.resolve();

    expect(console.error).toHaveBeenCalled();

    expect(btn.disabled).toBe(false);

    expect(btn.textContent)
      .toBe('Sign in with Google');
  });

  test('stores user after SIGNED_IN event', async () => {
    initLoginPage();

    const callback =
      onAuthStateChange.mock.calls[0][0];

    await callback({
      event: 'SIGNED_IN',
      role: 'member',
      session: {
        user: {
          id: '1',
          email: 'test@test.com',
          user_metadata: {
            full_name: 'John Doe'
          }
        }
      },
      profile: {
        full_name: 'John Doe'
      }
    });

    const stored =
      JSON.parse(
        localStorage.getItem('stokvel_user')
      );

    expect(stored.email)
      .toBe('test@test.com');

    expect(stored.role)
      .toBe('member');
  });

  test('redirects admin correctly', async () => {
    initLoginPage();

    const callback =
      onAuthStateChange.mock.calls[0][0];

    await callback({
      event: 'SIGNED_IN',
      role: 'admin',
      session: {
        user: {
          id: '1',
          email: 'admin@test.com',
          user_metadata: {}
        }
      },
      profile: {}
    });

    expect(navigateTo).toHaveBeenCalledWith('admin-dashboard.html');
  });

  test('redirects treasurer correctly', async () => {
    initLoginPage();

    const callback =
      onAuthStateChange.mock.calls[0][0];

    await callback({
      event: 'SIGNED_IN',
      role: 'treasurer',
      session: {
        user: {
          id: '1',
          email: 'treasurer@test.com',
          user_metadata: {}
        }
      },
      profile: {}
    });

    expect(navigateTo).toHaveBeenCalledWith('treasurer-dashboard.html');
  });

  test('redirects member correctly', async () => {
    initLoginPage();

    const callback =
      onAuthStateChange.mock.calls[0][0];

    await callback({
      event: 'SIGNED_IN',
      role: 'member',
      session: {
        user: {
          id: '1',
          email: 'member@test.com',
          user_metadata: {}
        }
      },
      profile: {}
    });

    expect(navigateTo).toHaveBeenCalledWith('member-dashboard.html');
  });

  test('accepts pending invitation', async () => {
    localStorage.setItem(
      'pending_invite_token',
      'abc123'
    );

    acceptInvitation.mockResolvedValue({
      role: 'treasurer'
    });

    initLoginPage();

    const callback =
      onAuthStateChange.mock.calls[0][0];

    await callback({
      event: 'SIGNED_IN',
      role: 'member',
      session: {
        user: {
          id: '1',
          email: 'test@test.com',
          user_metadata: {}
        }
      },
      profile: {}
    });

    expect(acceptInvitation)
      .toHaveBeenCalledWith('abc123');
  });

});

describe('checkAuth', () => {

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="user-name"></div>
      <div class="user-role"></div>
      <div class="user-avatar"></div>

      <div class="sidebar-nav">
        <div class="nav-section"></div>
      </div>
    `;

    delete window.location;

    window.location = {
      href: '',
      pathname: '/admin-dashboard.html'
    };

    localStorage.clear();
  });

  test('redirects if no user exists', () => {
    checkAuth();

    expect(navigateTo).toHaveBeenCalledWith('index.html');
  });

  test('updates sidebar info', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'John Doe',
        role: 'admin',
        avatar: 'JD'
      })
    );

    checkAuth();

    expect(
      document.querySelector('.user-name')
        .textContent
    ).toBe('John Doe');

    expect(
      document.querySelector('.user-role')
        .textContent
    ).toBe('Admin');

    expect(
      document.querySelector('.user-avatar')
        .textContent
    ).toBe('JD');
  });

  test('renders admin nav links', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'admin'
      })
    );

    checkAuth();

    expect(
      document.querySelector('.nav-section')
        .innerHTML
    ).toContain('Create Group');
  });

  test('renders member nav links', () => {
    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'member'
      })
    );

    checkAuth();

    expect(
      document.querySelector('.nav-section')
        .innerHTML
    ).toContain('My Contributions');
  });

});

describe('logout', () => {

  beforeEach(() => {
    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        name: 'John'
      })
    );

    delete window.location;

    window.location = {
      href: ''
    };
  });

  test('calls signOut', async () => {
    logout();

    await Promise.resolve();

    expect(signOut).toHaveBeenCalled();
  });

  test('removes localStorage user', async () => {
    logout();

    await Promise.resolve();

    expect(
      localStorage.getItem('stokvel_user')
    ).toBeNull();
  });

  test('redirects to index page', async () => {
    logout();

    await Promise.resolve();

    expect(navigateTo).toHaveBeenCalledWith('index.html');
  });

});
