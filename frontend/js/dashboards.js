// ============================================================
// dashboards.js
// Member dashboard, Treasurer dashboard, My Groups page.
// Each section is independently try/caught so one failing
// data fetch does not crash the rest of the dashboard.
// ============================================================

import { showToast, formatCurrency, formatDate } from './utils.js';
import { getMyGroups, getMyContributions } from './supabase-client.js';

// Lazy-import new functions only if the tables exist
async function safeGetAllContributions() {
  try {
    const { getAllContributions } = await import('./supabase-client.js');
    return await getAllContributions();
  } catch (err) {
    console.warn('getAllContributions not available:', err.message);
    return [];
  }
}

async function safeGetMyMeetings() {
  try {
    const { getMyMeetings } = await import('./supabase-client.js');
    return await getMyMeetings();
  } catch (err) {
    console.warn('getMyMeetings not available:', err.message);
    return [];
  }
}

// ============================================================
// MEMBER DASHBOARD
// ============================================================

export async function initMemberDashboard() {
  const user = JSON.parse(localStorage.getItem('stokvel_user') || '{}');

  const heading = document.querySelector('.page-header h1');
  if (heading && user.name) heading.textContent = `Welcome, ${user.name.split(' ')[0]}!`;

  // Each section is independent — one failing won't break the others
  loadMemberGroups();
  loadMemberStats();
  loadRecentContributions();
  loadNextMeeting();
}

async function loadMemberStats() {
  try {
    const contributions = await getMyContributions();
    const completed = contributions.filter(c => c.status === 'completed');
    const pending   = contributions.filter(c => c.status === 'pending');
    const totalAmt  = completed.reduce((s, c) => s + Number(c.amount), 0);

    const totalEl   = document.querySelector('[data-testid="stat-total-contributed"] .stat-value');
    const pendingEl = document.querySelector('[data-testid="stat-pending"] .stat-value');
    if (totalEl)   totalEl.textContent = formatCurrency(totalAmt);
    if (pendingEl) pendingEl.textContent = pending.length;

    // Next payment due
    const nextDue = pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
    const nextEl  = document.querySelector('[data-testid="stat-next-payment"] .stat-value');
    if (nextEl) nextEl.textContent = nextDue ? formatDate(nextDue.due_date) : 'None due';

    // Payment reminder banner
    const reminderEl = document.querySelector('[data-testid="payment-reminder"] p');
    if (reminderEl && nextDue) {
      reminderEl.innerHTML = `<strong>Payment Reminder:</strong> Your next contribution of ${formatCurrency(nextDue.amount)} is due on ${formatDate(nextDue.due_date)}.`;
    } else if (!nextDue) {
      const banner = document.querySelector('[data-testid="payment-reminder"]');
      if (banner) banner.style.display = 'none';
    }
  } catch (err) {
    console.warn('loadMemberStats:', err.message);
  }
}

async function loadMemberGroups() {
  const container = document.querySelector('[data-testid="member-groups"]');
  const countEl   = document.querySelector('[data-testid="stat-groups-count"] .stat-value');
  if (!container) return;

  try {
    const groups = await getMyGroups();
    if (countEl) countEl.textContent = groups.length;

    if (!groups.length) {
      container.innerHTML = `<p style="color:var(--slate-400);padding:1rem 0;">You are not a member of any groups yet.</p>`;
      return;
    }

    container.innerHTML = groups.map(g => {
      const freq = g.frequency ? g.frequency.charAt(0).toUpperCase() + g.frequency.slice(1) : 'Monthly';
      const memberCount = g.group_members?.length ?? '—';
      return `
        <article class="group-card" data-testid="group-card-${g.id}">
          <header class="group-card-header">
            <section>
              <h3 class="group-name">${escHtml(g.name)}</h3>
              <mark class="badge badge-success">Active Member</mark>
            </section>
          </header>
          <ul class="group-meta">
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
              </svg>
              ${memberCount} / ${g.max_members ?? '—'} members
            </li>
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              ${formatCurrency(g.contribution_amount)} / ${freq}
            </li>
          </ul>
          ${g.next_payout ? `
            <footer style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--slate-200);">
              <p style="font-size:.85rem;color:var(--slate-600);">
                Next payout: <strong style="color:var(--forest-green);">${formatDate(g.next_payout)}</strong>
              </p>
            </footer>` : ''}
        </article>`;
    }).join('');
  } catch (err) {
    console.warn('loadMemberGroups:', err.message);
    if (container) container.innerHTML = `<p style="color:var(--slate-400);">Could not load groups. Please refresh.</p>`;
  }
}

async function loadRecentContributions() {
  const tbody = document.querySelector('[data-testid="recent-contributions-table"] tbody');
  if (!tbody) return;

  try {
    const contributions = await getMyContributions();
    const recent = contributions.slice(0, 5);

    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--slate-400);">No contributions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(c => {
      const badge = c.status === 'completed' ? 'badge-success'
                  : c.status === 'pending'   ? 'badge-warning' : 'badge-error';
      return `<tr>
        <td>${formatDate(c.due_date)}</td>
        <td>${escHtml(c.groups?.name || '—')}</td>
        <td class="amount-cell">${formatCurrency(c.amount)}</td>
        <td><mark class="badge ${badge}">${capitalize(c.status)}</mark></td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.warn('loadRecentContributions:', err.message);
  }
}

async function loadNextMeeting() {
  const meetingEl = document.getElementById('next-meeting-info');
  if (!meetingEl) return; // Element doesn't exist in HTML yet — skip silently

  try {
    const meetings = await safeGetMyMeetings();
    const upcoming = meetings.filter(m => new Date(m.scheduled_at) > new Date());
    if (!upcoming.length) { meetingEl.textContent = 'No upcoming meetings.'; return; }
    const next = upcoming[0];
    const date = new Date(next.scheduled_at).toLocaleDateString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    meetingEl.textContent = `${escHtml(next.title)} — ${date}`;
  } catch (_) {}
}

// ============================================================
// TREASURER DASHBOARD
// ============================================================

export async function initTreasurerDashboard() {
  // Wire Quick Action buttons to real pages
  const recordBtn  = document.querySelector('[data-testid="btn-record-contribution"]');
  const payoutBtn  = document.querySelector('[data-testid="btn-schedule-payout"]');
  const reportBtn  = document.querySelector('[data-testid="btn-generate-report"]');
  const meetingBtn = document.querySelector('[data-testid="btn-schedule-meeting"]');

  if (recordBtn)  recordBtn.addEventListener('click',  () => window.location.href = 'contributions.html');
  if (payoutBtn)  payoutBtn.addEventListener('click',  () => window.location.href = 'payouts.html');
  if (reportBtn)  reportBtn.addEventListener('click',  () => window.location.href = 'analytics.html');
  if (meetingBtn) meetingBtn.addEventListener('click', () => window.location.href = 'meetings.html');

  // Remove "frontend demonstration" note
  const note = document.querySelector('[data-testid="treasurer-info"]');
  if (note) note.style.display = 'none';

  // Load stats and table independently
  loadTreasurerStats();
  loadTreasurerRecentContributions();
}

async function loadTreasurerStats() {
  try {
    const contributions = await safeGetAllContributions();
    if (!contributions.length) return;

    const pending = contributions.filter(c => c.status === 'pending').length;
    const now = new Date();
    const thisMonth = contributions
      .filter(c => {
        if (!c.paid_at) return false;
        const d = new Date(c.paid_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, c) => s + Number(c.amount), 0);

    const pendingEl = document.querySelector('[data-testid="stat-pending-contributions"] .stat-value');
    const monthEl   = document.querySelector('[data-testid="stat-this-month"] .stat-value');
    if (pendingEl) pendingEl.textContent = pending;
    if (monthEl)   monthEl.textContent   = formatCurrency(thisMonth);
  } catch (err) {
    console.warn('loadTreasurerStats:', err.message);
  }
}

async function loadTreasurerRecentContributions() {
  const tbody = document.querySelector('[data-testid="recent-contributions-table"] tbody');
  if (!tbody) return;

  try {
    const contributions = await safeGetAllContributions();
    const recent = contributions.slice(0, 8);

    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--slate-400);">No contributions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(c => {
      const badge = c.status === 'completed' ? 'badge-success'
                  : c.status === 'pending'   ? 'badge-warning' : 'badge-error';
      return `<tr>
        <td>${escHtml(c.profiles?.full_name || '—')}</td>
        <td>${formatDate(c.due_date)}</td>
        <td>${escHtml(c.groups?.name || '—')}</td>
        <td class="amount-cell">${formatCurrency(c.amount)}</td>
        <td><mark class="badge ${badge}">${capitalize(c.status)}</mark></td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.warn('loadTreasurerRecentContributions:', err.message);
  }
}

// ============================================================
// MY GROUPS PAGE
// ============================================================

export async function initMyGroups() {
  const container = document.getElementById('groups-container');
  const countEl   = document.getElementById('stat-group-count');
  const monthlyEl = document.getElementById('stat-monthly-total');

  if (!container) return;
  container.innerHTML = `<p style="padding:1.5rem;color:var(--slate-400);">Loading groups…</p>`;

  try {
    const groups = await getMyGroups();

    if (countEl)   countEl.textContent   = groups.length;
    if (monthlyEl) monthlyEl.textContent = formatCurrency(
      groups.reduce((s, g) => s + Number(g.contribution_amount || 0), 0)
    );

    if (!groups.length) {
      container.innerHTML = `
        <section class="empty-state" style="grid-column:1/-1;padding:3rem;text-align:center;">
          <p style="color:var(--slate-500);margin:0;">You are not a member of any groups yet.</p>
          <p style="color:var(--slate-400);font-size:.85rem;margin-top:.5rem;">Ask your admin to send you an invitation.</p>
        </section>`;
      return;
    }

    container.innerHTML = groups.map(g => {
      const memberCount = g.group_members?.length ?? '—';
      const freq = g.frequency ? g.frequency.charAt(0).toUpperCase() + g.frequency.slice(1) : 'Monthly';
      const statusClass = g.status === 'active' ? 'badge-success'
                        : g.status === 'inactive' ? 'badge-warning' : 'badge-error';
      return `
        <article class="group-card" data-testid="group-card-${g.id}">
          <header class="group-card-header">
            <section>
              <h3 class="group-name">${escHtml(g.name)}</h3>
              <mark class="badge ${statusClass}">${capitalize(g.status)}</mark>
            </section>
          </header>
          ${g.description ? `<p style="font-size:.85rem;color:var(--slate-500);margin:.5rem 0 .75rem;">${escHtml(g.description)}</p>` : ''}
          <ul class="group-meta">
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
              </svg>
              ${memberCount} / ${g.max_members ?? '—'} members
            </li>
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              ${formatCurrency(g.contribution_amount)} / ${freq}
            </li>
          </ul>
        </article>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--slate-500);padding:2rem;text-align:center;">Could not load groups. Please refresh.</p>`;
    showToast('Failed to load groups: ' + err.message, 'error');
  }
}

// ── Helpers ──────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
