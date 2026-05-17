import { initCreateGroup } from '../groups.js';

jest.mock('../supabase-client.js', () => ({
  createGroup: jest.fn()
}));

jest.mock('../utils.js', () => ({
  showToast: jest.fn()
}));

import { createGroup } from '../supabase-client.js';
import { showToast } from '../utils.js';

describe('groups.js', () => {

  beforeEach(() => {

    document.body.innerHTML = `
      <form id="create-group-form">
        <input id="groupName" type="text" />
        <input id="contribution" type="number" />
        <select id="frequency">
          <option value="">Select</option>
          <option value="Monthly">Monthly</option>
        </select>
        <textarea id="description"></textarea>
        <button type="submit">Create Group</button>
      </form>
    `;

    jest.clearAllMocks();
  });

  test('GIVEN no form, WHEN initCreateGroup called, THEN does not throw', () => {

    document.body.innerHTML = '';

    expect(() => initCreateGroup()).not.toThrow();
  });

  test('GIVEN empty name, WHEN form submitted, THEN validation error shown', async () => {

    initCreateGroup();

    document.getElementById('contribution').value = '500';
    document.getElementById('frequency').value = 'Monthly';

    const form = document.getElementById('create-group-form');

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      'Please enter a group name',
      'error'
    );
  });

  test('GIVEN invalid contribution, WHEN form submitted, THEN validation error shown', async () => {

    initCreateGroup();

    document.getElementById('groupName').value = 'Test Group';
    document.getElementById('contribution').value = '-5';
    document.getElementById('frequency').value = 'Monthly';

    const form = document.getElementById('create-group-form');

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      'Please enter a valid contribution amount',
      'error'
    );
  });

  test('GIVEN missing frequency, WHEN form submitted, THEN validation error shown', async () => {

    initCreateGroup();

    document.getElementById('groupName').value = 'Test Group';
    document.getElementById('contribution').value = '500';

    const form = document.getElementById('create-group-form');

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      'Please select a contribution frequency',
      'error'
    );
  });

  test('GIVEN valid form, WHEN submitted, THEN createGroup called', async () => {

    createGroup.mockResolvedValue({});

    initCreateGroup();

    document.getElementById('groupName').value = 'Family Stokvel';
    document.getElementById('contribution').value = '500';
    document.getElementById('frequency').value = 'Monthly';
    document.getElementById('description').value = 'Savings group';

    const form = document.getElementById('create-group-form');

    await form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(createGroup).toHaveBeenCalled();

    expect(showToast).toHaveBeenCalledWith(
      'Group created successfully!'
    );
  });

  test('GIVEN createGroup fails, WHEN submitted, THEN error toast shown', async () => {

    createGroup.mockRejectedValue(
      new Error('Database failed')
    );

    initCreateGroup();

    document.getElementById('groupName').value = 'Family Stokvel';
    document.getElementById('contribution').value = '500';
    document.getElementById('frequency').value = 'Monthly';

    const form = document.getElementById('create-group-form');

    await form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(showToast).toHaveBeenCalledWith(
      'Error: Database failed',
      'error'
    );
  });

});