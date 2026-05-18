/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  getCurrentUser: jest.fn(),
  getMyGroups: jest.fn(),
  getMyContributions: jest.fn(),
  getMyMeetings: jest.fn(),
  getPayoutSchedule: jest.fn(),
  supabase: {}
}));

jest.mock('../utils.js', () => ({
  formatCurrency: jest.fn(amount => `R${amount}`),
  formatDate: jest.fn(date => 'formatted-date'),
  showToast: jest.fn()
}));

import {
  getCurrentUser,
  getMyGroups,
  getMyContributions,
  getMyMeetings,
  getPayoutSchedule
} from '../supabase-client.js';

import {
  formatCurrency,
  formatDate,
  showToast
} from '../utils.js';

import { initNotifications } from '../notifications.js';

describe('notifications.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <div id="sidebar-avatar"></div>
      <div id="sidebar-name"></div>
      <div id="sidebar-role"></div>

      <div id="notifications-list"></div>

      <button id="filter-all"></button>
      <button id="filter-payment"></button>
      <button id="filter-meeting"></button>
      <button id="filter-payout"></button>
      <button id="filter-group"></button>
    `;

    localStorage.clear();
  });

  // =====================================================
  // initNotifications
  // =====================================================

  test('loads sidebar user info from localStorage', async () => {
    localStorage.setItem('stokvel_user', JSON.stringify({
      name: 'John Doe',
      role: 'member'
    }));

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initNotifications();

    expect(document.getElementById('sidebar-name').textContent)
      .toBe('John Doe');

    expect(document.getElementById('sidebar-role').textContent)
      .toBe('member');

    expect(document.getElementById('sidebar-avatar').textContent)
      .toBe('JD');
  });

  test('handles missing sidebar elements safely', async () => {
    document.body.innerHTML = `
      <div id="notifications-list"></div>
    `;

    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await expect(initNotifications()).resolves.not.toThrow();
  });

  // =====================================================
  // Contribution notifications
  // =====================================================

  test('renders completed contribution notification', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'completed',
        amount: 500,
        paid_at: '2026-05-01',
        groups: {
          name: 'Savings Group'
        }
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Payment received');
  });

  test('renders missed contribution notification', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'missed',
        amount: 300,
        due_date: '2026-05-01',
        groups: {
          name: 'Holiday Fund'
        }
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Missed contribution');
  });

  test('renders overdue contribution notification', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'pending',
        amount: 700,
        due_date: '2020-01-01',
        groups: {
          name: 'Emergency Fund'
        }
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Contribution overdue');
  });

  // =====================================================
  // Meeting notifications
  // =====================================================

  test('renders upcoming meeting notification', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 1,
        name: 'Main Group'
      }
    ]);

    getMyContributions.mockResolvedValue([]);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    getMyMeetings.mockResolvedValue([
      {
        title: 'Monthly Meeting',
        scheduled_at: futureDate.toISOString()
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Upcoming meeting');
  });

  test('renders meeting minutes notification', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 1,
        name: 'Main Group'
      }
    ]);

    getMyContributions.mockResolvedValue([]);

    getMyMeetings.mockResolvedValue([
      {
        title: 'Planning Session',
        scheduled_at: '2026-05-01',
        minutes: 'Minutes text'
      }
    ]);

    getPayoutSchedule.mockResolvedValue([]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Meeting minutes available');
  });

  // =====================================================
  // Payout notifications
  // =====================================================

  test('renders paid payout notification', async () => {
    getCurrentUser.mockResolvedValue({
      id: 99
    });

    getMyGroups.mockResolvedValue([
      {
        id: 1,
        name: 'Investment Group'
      }
    ]);

    getMyContributions.mockResolvedValue([]);
    getMyMeetings.mockResolvedValue([]);

    getPayoutSchedule.mockResolvedValue([
      {
        status: 'paid',
        user_id: 99,
        amount: 5000,
        scheduled_date: '2026-05-01'
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Payout disbursed to you');
  });

  test('renders upcoming payout notification', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    getCurrentUser.mockResolvedValue({
      id: 77
    });

    getMyGroups.mockResolvedValue([
      {
        id: 1,
        name: 'Savings Club'
      }
    ]);

    getMyContributions.mockResolvedValue([]);
    getMyMeetings.mockResolvedValue([]);

    getPayoutSchedule.mockResolvedValue([
      {
        status: 'pending',
        user_id: 77,
        amount: 9000,
        scheduled_date: futureDate.toISOString()
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Your payout is coming up');
  });

  // =====================================================
  // Group notifications
  // =====================================================

  test('renders group membership notification', async () => {
    getMyGroups.mockResolvedValue([
      {
        id: 1,
        name: 'Community Group',
        contribution_amount: 250,
        frequency: 'monthly',
        created_at: '2026-05-01'
      }
    ]);

    getMyContributions.mockResolvedValue([]);
    getMyMeetings.mockResolvedValue([]);
    getPayoutSchedule.mockResolvedValue([]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Group membership');
  });

  // =====================================================
  // Empty notifications
  // =====================================================

  test('renders empty state when no notifications exist', async () => {
    getMyGroups.mockResolvedValue([]);
    getMyContributions.mockResolvedValue([]);

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('No notifications yet');
  });

  // =====================================================
  // Error handling
  // =====================================================

  test('renders error message if loading fails', async () => {
    getMyGroups.mockRejectedValue(
      new Error('Database failure')
    );

    await initNotifications();

    expect(document.body.innerHTML)
      .toContain('Could not load notifications');
  });

  // =====================================================
  // filterNotifs
  // =====================================================

  test('filters notifications by type', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'completed',
        amount: 500,
        paid_at: '2026-05-01',
        groups: {
          name: 'Savings Group'
        }
      }
    ]);

    await initNotifications();

    window.filterNotifs('payment');

    expect(document.body.innerHTML)
      .toContain('Payment received');
  });

  // =====================================================
  // clearNotifications
  // =====================================================

  test('clears notifications and shows toast', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'completed',
        amount: 500,
        paid_at: '2026-05-01',
        groups: {
          name: 'Savings Group'
        }
      }
    ]);

    await initNotifications();

    window.clearNotifications();

    expect(document.body.innerHTML)
      .toContain('No notifications yet');

    expect(showToast)
      .toHaveBeenCalledWith(
        'Notifications cleared',
        'success'
      );
  });

  // =====================================================
  // HTML escaping
  // =====================================================

  test('escapes dangerous HTML in notification content', async () => {
    getMyGroups.mockResolvedValue([]);

    getMyContributions.mockResolvedValue([
      {
        status: 'completed',
        amount: 500,
        paid_at: '2026-05-01',
        groups: {
          name: '<script>alert(1)</script>'
        }
      }
    ]);

    await initNotifications();

    expect(document.body.innerHTML)
      .not.toContain('<script>');

    expect(document.body.innerHTML)
      .toContain('&lt;script&gt;');
  });

});