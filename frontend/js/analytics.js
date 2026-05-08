// ============================================================
// analytics.js
// Three dashboard reports:
//   1. Contribution compliance per member (bar chart)
//   2. Collections by month (line chart)
//   3. Payout schedule summary (custom table)
// CSV export for each report.
// ============================================================

import {
  getMyGroups, getContributionCompliance,
  getContributionsByMonth, getPayoutSchedule
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

let _complianceData = [];
let _monthlyData    = [];
let _payoutData     = [];

export async function initAnalytics() {
  await populateGroupSelector();
}

async function populateGroupSelector() {
  const select = document.getElementById('analytics-group-select');
  if (!select) return;

  try {
    const groups = await getMyGroups();
    if (!groups.length) {
      document.getElementById('analytics-content').innerHTML =
        '<p style="color:var(--slate-400);">No groups available.</p>';
      return;
    }

    select.innerHTML = groups.map(g =>
      `<option value="${g.id}">${escHtml(g.name)}</option>`
    ).join('');

    select.addEventListener('change', () => loadAllReports(select.value));
    await loadAllReports(groups[0].id);
  } catch (err) {
    showToast('Could not load groups: ' + err.message, 'error');
  }
}

async function loadAllReports(groupId) {
  const [compliance, monthly, payout] = await Promise.allSettled([
    getContributionCompliance(groupId),
    getContributionsByMonth(groupId),
    getPayoutSchedule(groupId),
  ]);

  _complianceData = compliance.status === 'fulfilled' ? compliance.value : [];
  _monthlyData    = monthly.status === 'fulfilled'    ? monthly.value    : [];
  _payoutData     = payout.status === 'fulfilled'     ? payout.value     : [];

  renderComplianceChart();
  renderMonthlyChart();
  renderPayoutTable();
}

function renderComplianceChart() {
  const canvas = document.getElementById('compliance-chart');
  const noData = document.getElementById('compliance-no-data');
  if (!canvas) return;
  if (canvas._chartInstance) canvas._chartInstance.destroy();
  if (!_complianceData.length) {
    canvas.style.display = 'none';
    if (noData) noData.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  if (noData) noData.style.display = 'none';
  canvas._chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: _complianceData.map(m => m.name),
      datasets: [
        { label: 'On time (%)', data: _complianceData.map(m => m.compliance_pct), backgroundColor: '#1D9E75', borderRadius: 6 },
        { label: 'Late',        data: _complianceData.map(m => m.late),           backgroundColor: '#EF9F27', borderRadius: 6 },
        { label: 'Missed',      data: _complianceData.map(m => m.missed),         backgroundColor: '#E24B4A', borderRadius: 6 },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, max: 100 } } },
  });
}

function renderMonthlyChart() {
  const canvas = document.getElementById('monthly-chart');
  const noData = document.getElementById('monthly-no-data');
  if (!canvas) return;
  if (canvas._chartInstance) canvas._chartInstance.destroy();
  if (!_monthlyData.length) {
    canvas.style.display = 'none';
    if (noData) noData.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  if (noData) noData.style.display = 'none';
  canvas._chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: _monthlyData.map(d => d.month),
      datasets: [{ label: 'Total collected (ZAR)', data: _monthlyData.map(d => d.total_amount), borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.1)', tension: 0.3, fill: true, pointRadius: 5 }],
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } },
  });
}

function renderPayoutTable() {
  const container = document.getElementById('payout-report-container');
  if (!container) return;
  if (!_payoutData.length) {
    container.innerHTML = '<p style="color:var(--slate-400);">No payout schedule set for this group.</p>';
    return;
  }
  const paid    = _payoutData.filter(r => r.status === 'paid').length;
  const pending = _payoutData.filter(r => r.status === 'pending').length;
  const total   = _payoutData.reduce((s, r) => s + Number(r.amount || 0), 0);
  container.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
      <div class="stat-card" style="flex:1;min-width:120px;padding:.75rem;"><strong class="stat-value">${paid}</strong><p class="stat-label">Payouts made</p></div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:.75rem;"><strong class="stat-value">${pending}</strong><p class="stat-label">Upcoming</p></div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:.75rem;"><strong class="stat-value">${formatCurrency(total)}</strong><p class="stat-label">Total scheduled</p></div>
    </div>
    <div class="table-container"><table>
      <thead><tr><th>#</th><th>Member</th><th>Scheduled date</th><th style="text-align:right;">Amount</th><th>Status</th></tr></thead>
      <tbody>${_payoutData.map(r => {
        const badge = r.status === 'paid' ? 'badge-success' : r.status === 'skipped' ? 'badge-error' : 'badge-warning';
        return `<tr><td>${r.position}</td><td>${escHtml(r.profiles?.full_name || '—')}</td><td>${r.scheduled_date ? formatDate(r.scheduled_date) : '—'}</td><td class="amount-cell">${r.amount ? formatCurrency(r.amount) : '—'}</td><td><mark class="badge ${badge}">${capitalize(r.status)}</mark></td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

// ── CSV Export ────────────────────────────────────────────────

window.exportComplianceCSV = function() {
  if (!_complianceData.length) { showToast('No data to export', 'error'); return; }
  downloadCSV([
    ['Member', 'Total', 'Completed', 'Late', 'Missed', 'Compliance %'],
    ..._complianceData.map(m => [m.name, m.total, m.completed, m.late, m.missed, m.compliance_pct + '%']),
  ], 'contribution_compliance.csv');
};

window.exportMonthlyCSV = function() {
  if (!_monthlyData.length) { showToast('No data to export', 'error'); return; }
  downloadCSV([
    ['Month', 'Total Collected (ZAR)'],
    ..._monthlyData.map(d => [d.month, d.total_amount]),
  ], 'monthly_collections.csv');
};

window.exportPayoutCSV = function() {
  if (!_payoutData.length) { showToast('No data to export', 'error'); return; }
  downloadCSV([
    ['Position', 'Member', 'Scheduled Date', 'Amount (ZAR)', 'Status'],
    ..._payoutData.map(r => [r.position, r.profiles?.full_name || '—', r.scheduled_date || '—', r.amount || '—', r.status]),
  ], 'payout_schedule.csv');
};

function downloadCSV(rows, filename) {
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded!', 'success');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
export { escHtml, capitalize };