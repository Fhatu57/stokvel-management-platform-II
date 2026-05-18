/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  getCurrentUser: jest.fn(),
  getProfile: jest.fn(),
  getMyGroups: jest.fn(),
  getMyContributions: jest.fn(),
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn(amount => `R${amount}`),
  formatDate: jest.fn(() => 'formatted-date'),
  showToast: jest.fn()
}));

import {
  getCurrentUser,
  getProfile,
  getMyGroups,
  getMyContributions,
  supabase
} from '../supabase-client.js';

import {
  formatCurrency,
  formatDate,
  showToast
} from '../utils.js';

import { initProfile } from '../profile.js';

describe('profile.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <div id="profile-avatar-circle"></div>

      <div id="sidebar-avatar"></div>
      <div id="sidebar-name"></div>
      <div id="sidebar-role"></div>

      <div id="profile-name"></div>
      <div id="profile-email"></div>
      <div id="profile-role-badge"></div>

      <input id="pf-name" />
      <input id="pf-email" />
      <input id="pf-role" />
      <input id="pf-since" />

      <div id="stat-total"></div>
      <div id="stat-compliance"></div>
      <div id="stat-groups"></div>
      <div id="stat-payments"></div>

      <div id="profile-groups-list"></div>

      <form id="profile-form"></form>

      <button id="save-profile-btn">
        Save Changes
      </button>
    `;

    localStorage.clear();

    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'member'
    }));
  });

  // =====================================================
  // initProfile
  // =====================================================

  test('loads and renders profile successfully', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe',
      email: 'john@test.com',
      created_at: '2026-05-01'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.getElementById('profile-name').textContent)
      .toBe('John Doe');

    expect(document.getElementById('profile-email').textContent)
      .toBe('john@test.com');

    expect(document.getElementById('sidebar-name').textContent)
      .toBe('John Doe');
  });

  test('returns early if no current user exists', async () => {
    getCurrentUser.mockResolvedValue(null);

    await initProfile();

    expect(getProfile).not.toHaveBeenCalled();
  });

  test('shows toast if profile loading fails', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockRejectedValue(
      new Error('Profile failed')
    );

    await initProfile();

    expect(showToast)
      .toHaveBeenCalledWith(
        'Failed to load profile: Profile failed',
        'error'
      );
  });

  // =====================================================
  // renderProfile
  // =====================================================

  test('renders initials correctly', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'Jane Smith',
      email: 'jane@test.com'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.getElementById('profile-avatar-circle').textContent)
      .toBe('JS');
  });

  test('renders admin badge class correctly', async () => {
    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'admin'
    }));

    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'Admin User',
      email: 'admin@test.com'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.getElementById('profile-role-badge').className)
      .toContain('badge-error');
  });

  test('renders treasurer badge class correctly', async () => {
    localStorage.setItem('stokvel_user', JSON.stringify({
      role: 'treasurer'
    }));

    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'Treasurer User',
      email: 'treasurer@test.com'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.getElementById('profile-role-badge').className)
      .toContain('badge-warning');
  });

  test('renders default member badge class correctly', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'Member User',
      email: 'member@test.com'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.getElementById('profile-role-badge').className)
      .toContain('badge-success');
  });

  // =====================================================
  // loadStats
  // =====================================================

  test('loads contribution statistics correctly', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([
      { id: 1 },
      { id: 2 }
    ]);

    getMyContributions.mockResolvedValue([
      {
        amount: 100,
        status: 'completed'
      },
      {
        amount: 200,
        status: 'pending'
      }
    ]);

    await initProfile();

    expect(document.getElementById('stat-total').textContent)
      .toBe('R300');

    expect(document.getElementById('stat-compliance').textContent)
      .toBe('50%');

    expect(document.getElementById('stat-groups').textContent)
      .toBe('2');

    expect(document.getElementById('stat-payments').textContent)
      .toBe('1');
  });

  test('handles stats loading failure gracefully', async () => {
    console.warn = jest.fn();

    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyContributions.mockRejectedValue(
      new Error('Stats failed')
    );

    getMyGroups.mockResolvedValue([]);

    await initProfile();

    expect(console.warn)
      .toHaveBeenCalled();
  });

  // =====================================================
  // loadGroups
  // =====================================================

  test('renders groups list correctly', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([
      {
        name: 'Savings Group',
        contribution_amount: 500,
        frequency: 'monthly'
      }
    ]);

    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.body.innerHTML)
      .toContain('Savings Group');
  });

  test('renders empty groups message', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.body.innerHTML)
      .toContain('Not a member of any group yet');
  });

  test('renders group loading failure message', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyContributions.mockResolvedValue([]);

    getMyGroups
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(
        new Error('Group failure')
      );

    await initProfile();

    expect(document.body.innerHTML)
      .toContain('Could not load groups');
  });

  // =====================================================
  // setupForm
  // =====================================================

  test('shows validation error for empty name', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initProfile();

    document.getElementById('pf-name').value = '';

    document
      .getElementById('profile-form')
      .dispatchEvent(new Event('submit'));

    expect(showToast)
      .toHaveBeenCalledWith(
        'Name cannot be empty.',
        'error'
      );
  });

  test('updates profile successfully', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'Old Name',
      email: 'old@test.com'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    const eqMock = jest.fn().mockResolvedValue({
      error: null
    });

    const updateMock = jest.fn(() => ({
      eq: eqMock
    }));

    supabase.from.mockReturnValue({
      update: updateMock
    });

    await initProfile();

    document.getElementById('pf-name').value =
      'New Name';

    document
      .getElementById('profile-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(updateMock)
      .toHaveBeenCalled();

    expect(showToast)
      .toHaveBeenCalledWith(
        'Profile updated successfully!',
        'success'
      );

    expect(document.getElementById('profile-name').textContent)
      .toBe('New Name');
  });

  test('handles profile update failure', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    const eqMock = jest.fn().mockResolvedValue({
      error: {
        message: 'Update failed'
      }
    });

    const updateMock = jest.fn(() => ({
      eq: eqMock
    }));

    supabase.from.mockReturnValue({
      update: updateMock
    });

    await initProfile();

    document.getElementById('pf-name').value =
      'Updated Name';

    document
      .getElementById('profile-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(showToast)
      .toHaveBeenCalledWith(
        'Failed to update: Update failed',
        'error'
      );
  });

  // =====================================================
  // HTML escaping
  // =====================================================

  test('escapes dangerous HTML in group names', async () => {
    getCurrentUser.mockResolvedValue({
      id: 1
    });

    getProfile.mockResolvedValue({
      full_name: 'John Doe'
    });

    getMyGroups.mockResolvedValue([
      {
        name: '<script>alert(1)</script>',
        contribution_amount: 100,
        frequency: 'monthly'
      }
    ]);

    getMyContributions.mockResolvedValue([]);

    await initProfile();

    expect(document.body.innerHTML)
      .not.toContain('<script>');

    expect(document.body.innerHTML)
      .toContain('&lt;script&gt;');
  });

});