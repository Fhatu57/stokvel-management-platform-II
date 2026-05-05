// ==================== CONTRIBUTIONS ====================
// NOTE: Mock data is always shown immediately on page load.
// If Supabase returns real data for this user it replaces the mock.
// This means every visitor sees something useful right away.
import { getMyContributions } from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

const MOCK_CONTRIBUTIONS = [
  { id: 'c001', date: '2026-04-15', amount: 500,  status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c002', date: '2026-03-15', amount: 500,  status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c003', date: '2026-02-15', amount: 500,  status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c004', date: '2026-01-15', amount: 500,  status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c005', date: '2025-12-15', amount: 750,  status: 'Completed', group: 'Family Unity Stokvel' },
  { id: 'c006', date: '2025-11-15', amount: 750,  status: 'Completed', group: 'Family Unity Stokvel' },
  { id: 'c007', date: '2025-10-15', amount: 500,  status: 'Completed', group: 'Soweto Savings Club' },
  { id: 'c008', date: '2026-05-15', amount: 500,  status: 'Pending',   group: 'Soweto Savings Club' },
  { id: 'c009', date: '2026-05-15', amount: 750,  status: 'Pending',   group: 'Family Unity Stokvel' },
  { id: 'c010', date: '2025-09-15', amount: 500,  status: 'Late',      group: 'Soweto Savings Club' },
  { id: 'c011', date: '2025-08-15', amount: 1000, status: 'Completed', group: 'Young Professionals' },
  { id: 'c012', date: '2025-07-15', amount: 1000, status: 'Late',      group: 'Young Professionals' },
];

let _allContributions = MOCK_CONTRIBUTIONS;
let _usingMock = true;

export async function initContributions() {
  // 1. Render mock data immediately — no waiting
  renderTable('all');

  // 2. Try to load real data in the background
  try {
    const raw = await getMyContributions();
    if (raw && raw.length > 0) {
      _allContributions = raw.map(c => ({
        id:     c.id,
        date:   c.due_date,
        group:  c.groups?.name || '—',
        amount: c.amount,
        status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
      }));
      _usingMock = false;

      // Re-render with real data
      const currentFilter = document.getElementById('contribution-filter')?.value || 'all';
      renderTable(currentFilter);
    }
  } catch (err) {
    console.warn('Using mock contributions:', err.message);
    // Mock already showing — nothing to do
  }

  // 3. Wire up filter
  const filterSelect = document.getElementById('contribution-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => renderTable(filterSelect.value));
  }
}

function renderTable(filter = 'all') {
  const tableBody = document.getElementById('contributions-table-body');
  if (!tableBody) return;

  const filtered = filter === 'all'
    ? _allContributions
    : _allContributions.filter(c => c.status.toLowerCase() === filter);

  // Update stat cards
  const totalAmount  = filtered.reduce((sum, c) => sum + c.amount, 0);
  const pendingCount = _allContributions.filter(c => c.status.toLowerCase() === 'pending').length;

  const totalEl   = document.getElementById('total-contributions');
  const countEl   = document.getElementById('contribution-count');
  const pendingEl = document.getElementById('pending-count');
  if (totalEl)   totalEl.textContent   = formatCurrency(totalAmount);
  if (countEl)   countEl.textContent   = filtered.length;
  if (pendingEl) pendingEl.textContent = pendingCount;

  // Update info note
  const infoEl = document.querySelector('[data-testid="contributions-info"] div');
  if (infoEl) {
    infoEl.innerHTML = _usingMock
      ? '<strong>Demo data:</strong> Showing sample contributions. Live data loads once your account is linked to a group.'
      : '<strong>Live data:</strong> Showing your actual contribution history.';
  }

  // Empty state
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:2rem;color:var(--slate-400);">
          No contributions found for this filter.
        </td>
      </tr>`;
    return;
  }

  window._contributions = _allContributions;

  tableBody.innerHTML = filtered.map(c => `
    <tr data-testid="contribution-row-${c.id}">
      <td>${formatDate(c.date)}</td>
      <td>${c.group}</td>
      <td class="amount-cell">${formatCurrency(c.amount)}</td>
      <td>
        <mark class="badge ${
          c.status === 'Completed' ? 'badge-success' :
          c.status === 'Pending'   ? 'badge-warning' : 'badge-error'
        }">${c.status}</mark>
      </td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="viewReceipt('${c.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          View
        </button>
      </td>
    </tr>
  `).join('');
}

window.viewReceipt = function(contributionId) {
  const c = (window._contributions || []).find(x => x.id === contributionId);
  if (c) showToast(`Receipt: ${c.group} — ${formatCurrency(c.amount)} on ${formatDate(c.date)}`);
};
