// ============================================================
// contributions.js
// Member view: own contributions + PayFast payment button.
// Treasurer/Admin view: all group contributions with
// confirm/flag actions.
// Sprint 3: PayFast sandbox payment integration.
// ============================================================

import {
  getMyContributions, getAllContributions,
  updateContributionStatus
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

// PayFast sandbox credentials
const PAYFAST_URL    = 'https://sandbox.payfast.co.za/eng/process';
const MERCHANT_ID    = '10048346';
const MERCHANT_KEY   = 'c34enhuqce8z4';
const RETURN_URL     = window.location.origin + '/contributions';
const CANCEL_URL     = window.location.origin + '/contributions';

function getRole() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').role || 'member'; } catch { return 'member'; }
}
function getUserName() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').name || ''; } catch { return ''; }
}
function getUserEmail() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').email || ''; } catch { return ''; }
}

export async function initContributions() {
  const tableBody = document.getElementById('contributions-table-body');
  const totalEl   = document.getElementById('total-contributions');
  const countEl   = document.getElementById('contribution-count');
  const pendingEl = document.getElementById('pending-count');
  const filterSel = document.getElementById('contribution-filter');
  const headerEl  = document.getElementById('contributions-header-row');

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--slate-400);">Loading contributions…</td></tr>`;

  const role        = getRole();
  const isTreasurer = role === 'treasurer' || role === 'admin';

  // Extend header for treasurer
  if (isTreasurer && headerEl) {
    headerEl.innerHTML = `
      <th>Member</th><th>Date</th><th>Group</th>
      <th style="text-align:right;">Amount</th><th>Status</th><th>Actions</th>`;
  }

  let contributions = [];
  try {
    contributions = isTreasurer ? await getAllContributions() : await getMyContributions();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--slate-400);">
      Could not load contributions. Please refresh.</td></tr>`;
    showToast('Failed to load: ' + err.message, 'error');
    return;
  }

  const rows = contributions.map(c => ({
    id:     c.id,
    date:   c.due_date || c.paid_at,
    group:  c.groups?.name || '—',
    member: c.profiles?.full_name || '—',
    amount: c.amount,
    status: c.status,
  }));

  window._contributionRows = rows;
  window._isTreasurer      = isTreasurer;

  if (filterSel) filterSel.addEventListener('change', () => renderTable(filterSel.value));

  renderTable('all');

  const pending  = rows.filter(r => r.status === 'pending').length;
  const totalAmt = rows.reduce((s, r) => s + Number(r.amount), 0);
  if (totalEl)   totalEl.textContent   = formatCurrency(totalAmt);
  if (countEl)   countEl.textContent   = rows.length;
  if (pendingEl) pendingEl.textContent = pending;

  // Check if returning from PayFast
  checkPayFastReturn();
}

// ── Table render ─────────────────────────────────────────────

function renderTable(filter = 'all') {
  const tableBody   = document.getElementById('contributions-table-body');
  if (!tableBody) return;

  const rows        = window._contributionRows || [];
  const isTreasurer = window._isTreasurer || false;

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status.toLowerCase() === filter);

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--slate-400);">
      No contributions found${filter !== 'all' ? ' for this filter' : ''}.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(c => {
    const badgeClass = c.status === 'completed' ? 'badge-success'
                     : c.status === 'pending'   ? 'badge-warning' : 'badge-error';

    const memberCol = isTreasurer ? `<td>${escHtml(c.member)}</td>` : '';

    // Pay Now button for members with pending contributions
    const payBtn = c.status === 'pending'
      ? `<button class="btn btn-primary btn-sm" onclick="window.payWithPayFast('${c.id}',${c.amount},'${escHtml(c.group)}')">Pay Now</button>`
      : '';

    const actionsCol = isTreasurer ? `
      <td style="white-space:nowrap;">
        ${c.status !== 'completed' ? `
          <button class="btn btn-ghost btn-sm" style="color:var(--forest-green);"
            onclick="window.confirmContribution('${c.id}','${escHtml(c.member)}')">✓ Confirm</button>` : ''}
        ${c.status === 'pending' ? `
          <button class="btn btn-ghost btn-sm" style="color:var(--red-600);"
            onclick="window.flagMissed('${c.id}')">✗ Flag</button>` : ''}
      </td>` : `<td>${payBtn}</td>`;

    return `
      <tr data-testid="contribution-row-${c.id}">
        ${memberCol}
        <td>${formatDate(c.date)}</td>
        <td>${escHtml(c.group)}</td>
        <td class="amount-cell">${formatCurrency(c.amount)}</td>
        <td><mark class="badge ${badgeClass}">${capitalize(c.status)}</mark></td>
        ${actionsCol}
      </tr>`;
  }).join('');
}

// ── PayFast payment ──────────────────────────────────────────

window.payWithPayFast = function(contributionId, amount, groupName) {
  const nameParts = getUserName().split(' ');
  const email     = getUserEmail();

  // Build and auto-submit PayFast form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_URL;

  const fields = {
    merchant_id:      MERCHANT_ID,
    merchant_key:     MERCHANT_KEY,
    return_url:       RETURN_URL,
    cancel_url:       CANCEL_URL,
    name_first:       nameParts[0] || 'Member',
    name_last:        nameParts[1] || '',
    email_address:    email,
    m_payment_id:     contributionId,
    amount:           Number(amount).toFixed(2),
    item_name:        `Stokvel Contribution - ${groupName}`,
    item_description: `Monthly stokvel contribution for ${groupName}`,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
};

// When PayFast redirects back, mark contribution as completed
async function checkPayFastReturn() {
  const params      = new URLSearchParams(window.location.search);
  const paymentId   = params.get('m_payment_id');
  if (!paymentId) return;

  try {
    await updateContributionStatus(paymentId, 'completed');
    showToast('Payment successful! Contribution marked as completed.', 'success');
    window.history.replaceState({}, '', window.location.pathname);
    // Refresh table
    const rows = window._contributionRows || [];
    const row  = rows.find(r => r.id === paymentId);
    if (row) row.status = 'completed';
    renderTable('all');
  } catch (err) {
    console.warn('Could not auto-confirm payment:', err.message);
  }
}

// ── Treasurer actions ────────────────────────────────────────

window.confirmContribution = async function(id, memberName) {
  try {
    await updateContributionStatus(id, 'completed');
    showToast(`Contribution confirmed for ${memberName} ✓`, 'success');
    const row = (window._contributionRows || []).find(r => r.id === id);
    if (row) row.status = 'completed';
    renderTable(document.getElementById('contribution-filter')?.value || 'all');
  } catch (err) {
    showToast('Failed to confirm: ' + err.message, 'error');
  }
};

window.flagMissed = async function(id) {
  try {
    await updateContributionStatus(id, 'missed');
    showToast('Contribution flagged as missed', 'success');
    const row = (window._contributionRows || []).find(r => r.id === id);
    if (row) row.status = 'missed';
    renderTable(document.getElementById('contribution-filter')?.value || 'all');
  } catch (err) {
    showToast('Failed to flag: ' + err.message, 'error');
  }
};

// ── Helpers ──────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
export { escHtml, capitalize, getRole, getUserName, getUserEmail };
