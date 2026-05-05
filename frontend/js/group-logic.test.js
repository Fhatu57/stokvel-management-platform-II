const { validateGroup } = require('./group-logic');

describe('validateGroup', () => {
  test('rejects a name shorter than 3 characters', () => {
    expect(validateGroup('AB', 500)).toBe('Name too short');
  });

  test('rejects a zero contribution amount', () => {
    expect(validateGroup('Soweto Savings Club', 0)).toBe('Amount must be positive');
  });

  test('rejects a negative contribution amount', () => {
    expect(validateGroup('Soweto Savings Club', -100)).toBe('Amount must be positive');
  });

  test('accepts a valid group name and positive amount', () => {
    expect(validateGroup('Soweto Savings Club', 500)).toBe('Valid');
  });

  test('accepts a name of exactly 3 characters', () => {
    expect(validateGroup('ABC', 100)).toBe('Valid');
  });
});
