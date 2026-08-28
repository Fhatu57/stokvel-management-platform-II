export const DEMO_ROLES = Object.freeze({
  member: {
    label: 'Member dashboard',
    heading: 'Welcome back, Thandi',
    intro: 'Track your savings, upcoming payments and stokvel activity in one place.',
    userRole: 'Member demo',
    stats: [
      ['Total contributed', 'R18,000', 'green'],
      ['Next payment', 'R1,500', 'amber'],
      ['Payout month', 'November', 'blue'],
      ['Active groups', '2', 'green'],
    ],
    progress: ['Emergency fund', '72% funded', 'R18,000', 'of a R25,000 group target', 72, 'R1,500 · 1 Sep'],
    event: ['05', 'September 2026', 'Monthly member meeting', '18:00 · Soweto Community Hall', 'Agenda ready'],
    tableTitle: 'Recent contributions',
    columns: ['Date', 'Group', 'Amount', 'Status'],
    rows: [
      ['01 Aug 2026', 'Ubuntu Savings Circle', 'R1,500', 'Completed'],
      ['01 Jul 2026', 'Ubuntu Savings Circle', 'R1,500', 'Completed'],
      ['25 Jun 2026', 'Family Education Fund', 'R750', 'Completed'],
      ['01 Jun 2026', 'Ubuntu Savings Circle', 'R1,500', 'Completed'],
    ],
  },
  treasurer: {
    label: 'Treasurer dashboard',
    heading: 'Financial overview',
    intro: 'Review collections, verify payments and monitor member compliance.',
    userRole: 'Treasurer demo',
    stats: [
      ['Collected this month', 'R24,750', 'green'],
      ['Pending verification', '3', 'amber'],
      ['Compliance rate', '92%', 'blue'],
      ['Members managed', '18', 'green'],
    ],
    progress: ['August collection target', '92% collected', 'R24,750', 'of a R27,000 monthly target', 92, '3 payments to verify'],
    event: ['31', 'August 2026', 'Payment verification closes', '17:00 · Treasurer workflow', '3 pending'],
    tableTitle: 'Payments requiring attention',
    columns: ['Member', 'Group', 'Amount', 'Status'],
    rows: [
      ['Lerato Molefe', 'Ubuntu Savings Circle', 'R1,500', 'Pending'],
      ['Kagiso Dlamini', 'Ubuntu Savings Circle', 'R1,500', 'Pending'],
      ['Nandi Khumalo', 'Family Education Fund', 'R750', 'Late'],
      ['Thandi Mokoena', 'Ubuntu Savings Circle', 'R1,500', 'Completed'],
    ],
  },
  admin: {
    label: 'Administrator dashboard',
    heading: 'Group operations',
    intro: 'Manage stokvel groups, invitations, roles and operational activity.',
    userRole: 'Administrator demo',
    stats: [
      ['Active groups', '4', 'green'],
      ['Total members', '42', 'blue'],
      ['Pending invites', '6', 'amber'],
      ['Funds tracked', 'R186k', 'green'],
    ],
    progress: ['Member onboarding', '86% complete', '42 members', 'of a 49-member capacity', 86, '6 invitations pending'],
    event: ['12', 'September 2026', 'Quarterly governance review', '10:00 · Online meeting', 'Admin only'],
    tableTitle: 'Latest operational activity',
    columns: ['Activity', 'Group', 'Owner', 'Status'],
    rows: [
      ['Member invited', 'Ubuntu Savings Circle', 'B. Nkosi', 'Pending'],
      ['Payout schedule updated', 'Family Education Fund', 'E. Mwandla', 'Completed'],
      ['Monthly meeting created', 'Community Builders', 'F. Masekwa', 'Completed'],
      ['Contribution flagged', 'Ubuntu Savings Circle', 'M. Lishivha', 'Review'],
    ],
  },
});

function createStat([label, value, tone]) {
  const card = document.createElement('article');
  card.className = 'stat-card demo-stat-card';

  const accent = document.createElement('span');
  accent.className = `demo-stat-accent ${tone}`;

  const strong = document.createElement('strong');
  strong.className = 'stat-value';
  strong.textContent = value;

  const copy = document.createElement('p');
  copy.className = 'stat-label';
  copy.textContent = label;

  card.append(accent, strong, copy);
  return card;
}

function statusClass(status) {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Late' || status === 'Review') return 'badge-error';
  return 'badge-warning';
}

export function renderRole(roleName = 'member', root = document) {
  const role = DEMO_ROLES[roleName] || DEMO_ROLES.member;
  root.getElementById('demo-role-label').textContent = role.label;
  root.getElementById('demo-heading').textContent = role.heading;
  root.getElementById('demo-intro').textContent = role.intro;
  root.getElementById('demo-sidebar-role').textContent = role.userRole;

  const stats = root.getElementById('demo-stats');
  stats.replaceChildren(...role.stats.map(createStat));

  const [title, badge, value, copy, percent, nextContribution] = role.progress;
  root.getElementById('demo-progress-title').textContent = title;
  root.getElementById('demo-progress-badge').textContent = badge;
  root.getElementById('demo-progress-value').textContent = value;
  root.getElementById('demo-progress-copy').textContent = copy;
  root.getElementById('demo-progress-bar').style.width = `${percent}%`;
  root.getElementById('demo-next-contribution').textContent = nextContribution;

  const [date, month, eventTitle, eventCopy, eventTag] = role.event;
  root.getElementById('demo-date').textContent = date;
  root.getElementById('demo-month').textContent = month;
  root.getElementById('demo-event-title').textContent = eventTitle;
  root.getElementById('demo-event-copy').textContent = eventCopy;
  root.getElementById('demo-event-tag').textContent = eventTag;

  root.getElementById('demo-table-title').textContent = role.tableTitle;
  const headRow = document.createElement('tr');
  role.columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headRow.appendChild(th);
  });
  root.getElementById('demo-table-head').replaceChildren(headRow);

  const rows = role.rows.map(row => {
    const tr = document.createElement('tr');
    row.forEach((value, index) => {
      const td = document.createElement('td');
      if (index === row.length - 1) {
        const badgeElement = document.createElement('mark');
        badgeElement.className = `badge ${statusClass(value)}`;
        badgeElement.textContent = value;
        td.appendChild(badgeElement);
      } else {
        td.textContent = value;
      }
      tr.appendChild(td);
    });
    return tr;
  });
  root.getElementById('demo-table-body').replaceChildren(...rows);

  root.querySelectorAll('[data-role]').forEach(button => {
    const active = button.dataset.role === roleName;
    button.classList.toggle('active', active);
    if (button.classList.contains('demo-mobile-role-switcher')) return;
    if (button.classList.contains('btn')) {
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-outline', !active);
    }
    button.setAttribute('aria-pressed', String(active));
  });
}

export function initDemo(root = document) {
  root.querySelectorAll('[data-role]').forEach(button => {
    button.addEventListener('click', () => renderRole(button.dataset.role, root));
  });
  renderRole('member', root);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initDemo());
}
