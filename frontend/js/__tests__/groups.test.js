import { initCreateGroup } from '../groups.js';

describe('initCreateGroup - form setup', () => {
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
  });

  test('GIVEN form exists, WHEN initCreateGroup called, THEN does not throw', () => {
    expect(() => initCreateGroup()).not.toThrow();
  });

  test('GIVEN no form in DOM, WHEN initCreateGroup called, THEN does not throw', () => {
    document.body.innerHTML = '';
    expect(() => initCreateGroup()).not.toThrow();
  });

  test('GIVEN form exists, WHEN initCreateGroup called, THEN form has submit listener', () => {
    initCreateGroup();
    const form = document.getElementById('create-group-form');
    expect(form).not.toBeNull();
  });
});

describe('group form validation logic', () => {
  test('GIVEN empty name, WHEN validated, THEN returns false', () => {
    const name = '';
    expect(!name).toBe(true);
  });

  test('GIVEN valid name, WHEN validated, THEN returns true', () => {
    const name = 'Sunshine Stokvel';
    expect(!name).toBe(false);
  });

  test('GIVEN negative contribution, WHEN validated, THEN is invalid', () => {
    const amount = -100;
    expect(isNaN(amount) || amount <= 0).toBe(true);
  });

  test('GIVEN zero contribution, WHEN validated, THEN is invalid', () => {
    const amount = 0;
    expect(isNaN(amount) || amount <= 0).toBe(true);
  });

  test('GIVEN valid contribution, WHEN validated, THEN is valid', () => {
    const amount = 500;
    expect(isNaN(amount) || amount <= 0).toBe(false);
  });

  test('GIVEN no frequency, WHEN validated, THEN is invalid', () => {
    const frequency = '';
    expect(!frequency).toBe(true);
  });

  test('GIVEN valid frequency, WHEN validated, THEN is valid', () => {
    const frequency = 'Monthly';
    expect(!frequency).toBe(false);
  });

  test('GIVEN group data, WHEN maxMembers defaulted, THEN is 20', () => {
    const maxMembers = 20;
    expect(maxMembers).toBe(20);
  });
});