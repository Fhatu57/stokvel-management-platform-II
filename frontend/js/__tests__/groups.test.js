/**
 * @jest-environment jsdom
 */

jest.mock('../supabase-client.js', () => ({
  createGroup: jest.fn()
}));

jest.mock('../utils.js', () => ({
  showToast: jest.fn(),
  navigateTo: jest.fn()
}));

import { createGroup } from '../supabase-client.js';
import { navigateTo, showToast } from '../utils.js';

import { initCreateGroup } from '../groups.js';

describe('create group functionality', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = `
      <form id="create-group-form">

        <input
          id="groupName"
          value="Savings Club"
        />

        <input
          id="contribution"
          value="500"
        />

        <select id="frequency">
          <option value="monthly" selected>
            Monthly
          </option>
        </select>

        <textarea id="description">
          Test description
        </textarea>

        <input
          id="startDate"
          value="2026-05-20"
        />

        <button type="submit">
          Create Group
        </button>

      </form>
    `;

    global.startDate = '2026-05-20';

    delete window.location;

    window.location = {
      href: ''
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =====================================================
  // Form existence
  // =====================================================

  test('logs error if form does not exist', () => {
    console.error = jest.fn();

    document.body.innerHTML = '';

    initCreateGroup();

    expect(console.error)
      .toHaveBeenCalledWith(
        'initCreateGroup: form #create-group-form not found in HTML'
      );
  });

  // =====================================================
  // Successful initialization
  // =====================================================

  test('attaches submit listener successfully', () => {
    initCreateGroup();

    const form =
      document.getElementById('create-group-form');

    expect(form).not.toBeNull();
  });

  // =====================================================
  // Validation
  // =====================================================

  test('shows error when group name is empty', async () => {
    initCreateGroup();

    document.getElementById('groupName').value = '';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    expect(showToast)
      .toHaveBeenCalledWith(
        'Please enter a group name',
        'error'
      );
  });

  test('shows error when contribution is invalid', async () => {
    initCreateGroup();

    document.getElementById('contribution').value = '-5';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    expect(showToast)
      .toHaveBeenCalledWith(
        'Please enter a valid contribution amount',
        'error'
      );
  });

  test('shows error when frequency is missing', async () => {
    initCreateGroup();

    document.getElementById('frequency').value = '';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    expect(showToast)
      .toHaveBeenCalledWith(
        'Please select a contribution frequency',
        'error'
      );
  });

  test('shows error when startDate is missing', async () => {
    initCreateGroup();

    document.getElementById('startDate').value = '';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    expect(showToast)
      .toHaveBeenCalledWith(
        'Please select a start date',
        'error'
      );
  });

  // =====================================================
  // Successful group creation
  // =====================================================

  test('creates group successfully', async () => {
    createGroup.mockResolvedValue({});

    initCreateGroup();

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(createGroup)
      .toHaveBeenCalledWith({
        name: 'Savings Club',
        description: 'Test description',
        contributionAmount: 500,
        frequency: 'monthly',
        maxMembers: 20
      });

    expect(showToast)
      .toHaveBeenCalledWith(
        'Group created successfully!'
      );
  });

  test('redirects after successful creation', async () => {
    createGroup.mockResolvedValue({});

    initCreateGroup();

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    jest.advanceTimersByTime(1000);

    expect(navigateTo).toHaveBeenCalledWith('admin-dashboard.html');
  });

  // =====================================================
  // Submit button states
  // =====================================================

  test('disables submit button while creating', async () => {
    createGroup.mockImplementation(
      () => new Promise(() => {})
    );

    initCreateGroup();

    const btn =
      document.querySelector('button[type="submit"]');

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    expect(btn.disabled)
      .toBe(true);

    expect(btn.textContent)
      .toBe('Creating...');
  });

  // =====================================================
  // Failed group creation
  // =====================================================

  test('handles createGroup failure', async () => {
    console.error = jest.fn();

    createGroup.mockRejectedValue(
      new Error('Database failed')
    );

    initCreateGroup();

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(console.error)
      .toHaveBeenCalled();

    expect(showToast)
      .toHaveBeenCalledWith(
        'Error: Database failed',
        'error'
      );
  });

  test('re-enables button after failure', async () => {
    createGroup.mockRejectedValue(
      new Error('Insert failed')
    );

    initCreateGroup();

    const btn =
      document.querySelector('button[type="submit"]');

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(btn.disabled)
      .toBe(false);

    expect(btn.textContent)
      .toBe('Create Group');
  });

  // =====================================================
  // Edge cases
  // =====================================================

  test('handles missing description gracefully', async () => {
    createGroup.mockResolvedValue({});

    initCreateGroup();

    document.getElementById('description').value = '';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(createGroup)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          description: ''
        })
      );
  });

  test('handles decimal contribution amounts', async () => {
    createGroup.mockResolvedValue({});

    initCreateGroup();

    document.getElementById('contribution').value =
      '1250.75';

    document
      .getElementById('create-group-form')
      .dispatchEvent(new Event('submit'));

    await Promise.resolve();

    expect(createGroup)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          contributionAmount: 1250.75
        })
      );
  });

});
