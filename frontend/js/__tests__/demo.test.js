/** @jest-environment jsdom */

import { DEMO_ROLES, initDemo, renderRole } from '../demo.js';

function setupDom() {
  document.body.innerHTML = `
    <button data-role="member"></button>
    <button data-role="treasurer"></button>
    <button data-role="admin"></button>
    <p id="demo-role-label"></p><h1 id="demo-heading"></h1><p id="demo-intro"></p>
    <p id="demo-sidebar-role"></p><section id="demo-stats"></section>
    <h2 id="demo-progress-title"></h2><span id="demo-progress-badge"></span>
    <strong id="demo-progress-value"></strong><p id="demo-progress-copy"></p>
    <span id="demo-progress-bar"></span><strong id="demo-next-contribution"></strong>
    <p id="demo-date"></p><p id="demo-month"></p><h2 id="demo-event-title"></h2>
    <p id="demo-event-copy"></p><span id="demo-event-tag"></span>
    <h2 id="demo-table-title"></h2><table><thead id="demo-table-head"></thead><tbody id="demo-table-body"></tbody></table>`;
}

describe('recruiter demo', () => {
  beforeEach(setupDom);

  test('contains member, treasurer and administrator views', () => {
    expect(Object.keys(DEMO_ROLES)).toEqual(['member', 'treasurer', 'admin']);
  });

  test('renders member data by default', () => {
    initDemo();
    expect(document.getElementById('demo-heading').textContent).toContain('Thandi');
    expect(document.querySelectorAll('#demo-stats .stat-card')).toHaveLength(4);
  });

  test('switches to the treasurer view', () => {
    renderRole('treasurer');
    expect(document.getElementById('demo-heading').textContent).toBe('Financial overview');
    expect(document.getElementById('demo-table-title').textContent).toBe('Payments requiring attention');
  });

  test('renders status values as badges', () => {
    renderRole('admin');
    expect(document.querySelectorAll('#demo-table-body .badge')).toHaveLength(4);
  });
});
