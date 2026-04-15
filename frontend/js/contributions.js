// ==================== CONTRIBUTIONS ====================
import { getMyContributions } from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

export async function initContributions() {
  await renderContributionsTable();

  const filterSelect = document.getElementById('contribution-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderContributionsTable(filterSelect.value);
    });
  }
}

async function renderContributionsTable(filter = 'all') {
  const tableBody = document.getElementById('contributions-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:2rem;">Loading...</td></tr>`;

  let contributions = [];
  try {
    const raw = await getMyContributions();
    contributions = raw.map(c => ({
      id: c.id,
      date: c.due_date,
      group: c.groups?.name || '—',
      amount: c.amount,
      status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
    }));
  } catch (err) {
    console.warn('Supabase fetch failed, using mock data:', err.message);
    contributions = [
      { id: 'c001', date: '2026-01-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
      { id: 'c002', date: '2025-12-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
      { id: 'c003', date: '2025-11-15', amount: 500, status: 'Completed', group: 'Soweto Savings Club' },
      { id: 'c004', date: '2025-10-15', amount: 500, status: 'Pending',   group: 'Soweto Savings Club' },
      { id: 'c005', date: '2025-09-15', amount: 500, status: 'Late',      group: 'Soweto Savings Club' },
    ];
  }

  let filtered = contributions;
  if (filter !== 'all') {
    filtered = contributions.filter(c => c.status.toLowerCase() === filter);
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="5" class="text-center" style="padding:2rem;">No contributions found</td></tr>
    `;
    return;
  }

  const totalAmount = filtered.reduce((sum, c) => sum + c.amount, 0);
  const totalEl = document.getElementById('total-contributions');
  const countEl = document.getElementById('contribution-count');
  if (totalEl) totalEl.textContent = formatCurrency(totalAmount);
  if (countEl) countEl.textContent = filtered.length;

  window._contributions = filtered;

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
  if (c) showToast(`Receipt: ${formatCurrency(c.amount)} on ${formatDate(c.date)}`);
};
