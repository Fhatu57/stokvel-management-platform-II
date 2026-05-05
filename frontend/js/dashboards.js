// ==================== MEMBER DASHBOARD ====================
import { showToast, formatCurrency } from './utils.js';
import { getMyGroups } from './supabase-client.js';

export function initMemberDashboard() {
  console.log('Member dashboard initialized');
}

// ==================== TREASURER DASHBOARD ====================

export function initTreasurerDashboard() {
  const recordBtn = document.querySelector('[data-testid="btn-record-contribution"]');
  const payoutBtn = document.querySelector('[data-testid="btn-schedule-payout"]');
  const reportBtn = document.querySelector('[data-testid="btn-generate-report"]');

  if (recordBtn) recordBtn.addEventListener('click', () => showToast('Record Contribution feature coming soon!'));
  if (payoutBtn) payoutBtn.addEventListener('click', () => showToast('Schedule Payout feature coming soon!'));
  if (reportBtn) reportBtn.addEventListener('click', () => showToast('Generate Report feature coming soon!'));
}

// ==================== MY GROUPS PAGE ====================

export async function initMyGroups() {
  const container   = document.getElementById('groups-container');
  const countEl     = document.getElementById('stat-group-count');
  const monthlyEl   = document.getElementById('stat-monthly-total');

  if (!container) return;

  try {
    const groups = await getMyGroups();

    // Update stats
    if (countEl) countEl.textContent = groups.length;
    if (monthlyEl) {
      const total = groups.reduce((sum, g) => sum + Number(g.contribution_amount || 0), 0);
      monthlyEl.textContent = formatCurrency(total);
    }

    if (groups.length === 0) {
      container.innerHTML = `
        <section class="empty-state" style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-300)" stroke-width="1.5" style="margin: 0 auto 1rem;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <p style="color: var(--slate-500); margin: 0;">You are not a member of any groups yet.</p>
          <p style="color: var(--slate-400); font-size: 0.85rem; margin-top: 0.5rem;">Ask your admin to send you an invitation.</p>
        </section>`;
      return;
    }

    container.innerHTML = groups.map(group => {
      const memberCount = group.group_members?.length ?? '—';
      const freq = group.frequency
        ? group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1)
        : 'Monthly';
      const statusClass = group.status === 'active' ? 'badge-success'
                        : group.status === 'inactive' ? 'badge-warning'
                        : 'badge-error';

      return `
        <article class="group-card" data-testid="group-card-${group.id}">
          <header class="group-card-header">
            <section>
              <h3 class="group-name">${escapeHtml(group.name)}</h3>
              <mark class="badge ${statusClass}">
                ${group.status.charAt(0).toUpperCase() + group.status.slice(1)}
              </mark>
            </section>
          </header>

          ${group.description ? `
            <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0.5rem 0 0.75rem;">
              ${escapeHtml(group.description)}
            </p>` : ''}

          <ul class="group-meta">
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              ${memberCount} / ${group.max_members ?? '—'} members
            </li>
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              ${formatCurrency(group.contribution_amount)} / ${freq}
            </li>
            ${group.next_payout ? `
            <li class="group-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Next payout: ${group.next_payout}
            </li>` : ''}
          </ul>
        </article>`;
    }).join('');

  } catch (err) {
    console.error('initMyGroups error:', err);
    container.innerHTML = `
      <section class="empty-state" style="grid-column: 1 / -1; padding: 2rem; text-align: center;">
        <p style="color: var(--slate-500);">Could not load groups. Please try refreshing.</p>
      </section>`;
    showToast('Failed to load groups: ' + err.message, 'error');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
