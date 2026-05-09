import { formatCurrency, formatDate, showToast } from '../utils.js';

describe('formatCurrency', () => {
  test('formats a whole number amount', () => { expect(formatCurrency(500)).toContain('500'); });
  test('formats zero correctly', () => { expect(formatCurrency(0)).toContain('0'); });
  test('formats large amounts', () => { expect(formatCurrency(12500)).toContain('12'); });
  test('includes ZAR currency indicator', () => { expect(formatCurrency(500)).toMatch(/R|ZAR/); });
  test('formats decimal amount', () => { expect(formatCurrency(500.50)).toContain('500'); });
  test('formats very large amount', () => { expect(formatCurrency(1000000)).toContain('000'); });
  test('formats amount between 1 and 999', () => { expect(formatCurrency(250)).toContain('250'); });
});

describe('formatDate', () => {
  test('formats a valid date string', () => { expect(formatDate('2026-05-15')).toBeTruthy(); });
  test('returns a non-empty string', () => { expect(formatDate('2026-01-01').length).toBeGreaterThan(0); });
  test('formats date with correct year', () => { expect(formatDate('2026-05-15')).toContain('2026'); });
  test('formats past date', () => { expect(formatDate('2020-03-01')).toContain('2020'); });
  test('formats future date', () => { expect(formatDate('2030-06-15')).toContain('2030'); });
  test('handles timestamp string', () => { expect(formatDate('2026-05-15T10:00:00Z')).toBeTruthy(); });
});

describe('showToast', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toast-container"></div>';
  });

  test('GIVEN container exists, WHEN showToast called with success, THEN does not throw', () => {
    expect(() => showToast('Test message', 'success')).not.toThrow();
  });

  test('GIVEN container exists, WHEN showToast called with error, THEN does not throw', () => {
    expect(() => showToast('Error message', 'error')).not.toThrow();
  });

  test('GIVEN container exists, WHEN showToast called, THEN toast is added to DOM', () => {
    showToast('Hello', 'success');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBeGreaterThan(0);
  });

  test('GIVEN container exists, WHEN showToast called, THEN toast contains message', () => {
    showToast('My message', 'success');
    const container = document.getElementById('toast-container');
    expect(container.innerHTML).toContain('My message');
  });

  test('GIVEN no container, WHEN showToast called, THEN does not throw', () => {
    document.body.innerHTML = '';
    expect(() => showToast('Test', 'success')).not.toThrow();
  });

  test('GIVEN container, WHEN showToast called twice, THEN two toasts added', () => {
    showToast('First', 'success');
    showToast('Second', 'error');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBe(2);
  });
});