
import { initInviteMembers } from '../invites.js';
import {
  sendInvitation,
  getGroupInvitations,
  getMyGroups
} from '../supabase-client.js';

// Mock Supabase client
jest.mock('../supabase-client.js', () => ({
  sendInvitation: jest.fn(),
  getGroupInvitations: jest.fn(),
  getMyGroups: jest.fn()
}));

// Mock utils
jest.mock('../utils.js', () => ({
  formatDate: jest.fn((date) => date),
  showToast: jest.fn()
}));

describe('invites.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    localStorage.setItem(
      'stokvel_user',
      JSON.stringify({
        role: 'admin',
        name: 'Boitumelo',
        email: 'admin@test.com'
      })
    );

    document.body.innerHTML = `
      <form id="invite-form">
        <input id="invite-email" type="email" />
        <select id="invite-role">
          <option value="member">Member</option>
          <option value="treasurer">Treasurer</option>
        </select>
        <select id="invite-group"></select>
        <button type="submit">Send Invite</button>
      </form>
      <section id="invite-list"></section>
    `;

    // Mock EmailJS
    window.emailjs = {
      init: jest.fn(),
      send: jest.fn(() => Promise.resolve())
    };

    // Mock location.origin
    delete window.location;
    window.location = {
      origin: 'http://localhost'
    };
  });

  test('does not throw when form does not exist', async () => {
    document.body.innerHTML = '';

    await expect(initInviteMembers()).resolves.not.toThrow();
  });

  test('loads groups into dropdown', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    await initInviteMembers();

    const groupSelect = document.getElementById('invite-group');

    expect(groupSelect.options.length).toBeGreaterThan(0);
    expect(groupSelect.innerHTML).toContain('Savings Group');
  });

  test('rejects invalid email', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    await initInviteMembers();

    document.getElementById('invite-email').value = 'bademail';
    document.getElementById('invite-group').value = 'group-1';

    document.getElementById('invite-form').dispatchEvent(
      new Event('submit')
    );

    expect(sendInvitation).not.toHaveBeenCalled();
  });

  test('rejects empty group selection', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    await initInviteMembers();

    document.getElementById('invite-email').value = 'user@test.com';
    document.getElementById('invite-group').value = '';

    document.getElementById('invite-form').dispatchEvent(
      new Event('submit')
    );

    expect(sendInvitation).not.toHaveBeenCalled();
  });

  test('sends invitation successfully', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    sendInvitation.mockResolvedValue({
      token: 'abc123'
    });

    await initInviteMembers();

    document.getElementById('invite-email').value = 'user@test.com';
    document.getElementById('invite-group').value = 'group-1';
    document.getElementById('invite-role').value = 'member';

    await document.getElementById('invite-form').dispatchEvent(
      new Event('submit')
    );

    expect(sendInvitation).toHaveBeenCalledWith(
      'group-1',
      'user@test.com',
      'member'
    );

    expect(window.emailjs.send).toHaveBeenCalled();
  });

  test('handles invitation failure', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    sendInvitation.mockRejectedValue(
      new Error('Database failed')
    );

    await initInviteMembers();

    document.getElementById('invite-email').value = 'user@test.com';
    document.getElementById('invite-group').value = 'group-1';

    await document.getElementById('invite-form').dispatchEvent(
      new Event('submit')
    );

    expect(sendInvitation).toHaveBeenCalled();
  });

  test('renders empty invite list', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([]);

    await initInviteMembers();

    const inviteList = document.getElementById('invite-list');

    expect(inviteList.innerHTML).toContain('No invitations sent yet');
  });

  test('renders invite list with invitations', async () => {
    getMyGroups.mockResolvedValue([
      { id: 'group-1', name: 'Savings Group' }
    ]);

    getGroupInvitations.mockResolvedValue([
      {
        id: '1',
        email: 'invite@test.com',
        created_at: '2026-01-01T00:00:00',
        role: 'member',
        status: 'pending'
      }
    ]);

    await initInviteMembers();

    const inviteList = document.getElementById('invite-list');

    expect(inviteList.innerHTML).toContain('invite@test.com');
    expect(inviteList.innerHTML).toContain('pending');
  });
});