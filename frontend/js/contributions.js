// ============================================================
// contributions.js
// Member view: own contributions + PayFast payment button.
// Treasurer/Admin view: all group contributions with
// confirm/flag actions + manual record contribution form.
// Sprint 4: PayFast integration, manual record form,
//           email notification on confirmation.
// ============================================================

import {
  getMyContributions, getAllContributions,
  updateContributionStatus, recordContribution,
  getMyGroups, supabase
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

// PayFast sandbox config — replace with live credentials for production
const PAYFAST_URL      = 'https://sandbox.payfast.co.za/eng/process';
const MERCHANT_ID      = '10000100';   // PayFast sandbox merchant ID
const MERCHANT_KEY     = '46f0cd694581a'; // PayFast sandbox merchant key
const RETURN_URL       = window.location.origin + '/contributions.html';
const CANCEL_URL       = window.location.origin + '/contributions';
const NOTIFY_URL       = ''; // Set to your Supabase Edge Function URL in production

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

  // Show record contribution form for treasurer
  if (isTreasurer) {
    await injectRecordForm();
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
    groupId: c.group_id,
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
}

// ── Table render ─────────────────────────────────────────────

function renderTable(filter = 'all') {
  const tableBody   = document.getElementById('contributions-table-body');
  if (!tableBody) return;

  const rows        = window._contributionRows || [];
  const isTreasurer = window._isTreasurer || false;
  const userId      = JSON.parse(localStorage.getItem('stokvel_user') || '{}').id;

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

    // PayFast pay button for members with pending contributions
    const payBtn = c.status === 'pending'
      ? `<button class="btn btn-primary btn-sm" onclick="window.payWithPayFast('${c.id}',${c.amount},'${escHtml(c.group)}')">Pay Now</button>`
      : '';

    const actionsCol = isTreasurer ? `
  <td style="white-space:nowrap;">
    ${payBtn}
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

// ── PayFast integration ──────────────────────────────────────

window.payWithPayFast = function(contributionId, amount, groupName) {
  const name  = getUserName().split(' ');
  const email = getUserEmail();

  // Store contributionId before leaving the page
  localStorage.setItem('pending_payment_id', contributionId);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_URL;

  const fields = {
    merchant_id:  MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url:   RETURN_URL,
    cancel_url:   `${CANCEL_URL}?cancelled=true`,
    notify_url:   NOTIFY_URL,
    name_first:   name[0] || 'Member',
    name_last:    name[1] || '',
    email_address: email,
    m_payment_id: contributionId,
    amount:       Number(amount).toFixed(2),
    item_name:    `Stokvel Contribution - ${groupName}`,
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

// Check if returning from PayFast with a successful payment
async function checkPayFastReturn() {
  const params    = new URLSearchParams(window.location.search);
  const cancelled = params.get('cancelled');
  const paymentId = localStorage.getItem('pending_payment_id');

  if (cancelled) {
    localStorage.removeItem('pending_payment_id');
    window.history.replaceState({}, '', window.location.pathname);
    showPaymentBanner('cancelled');
    return;
  }

  if (!paymentId) return;


  try {
    localStorage.removeItem('pending_payment_id');
    await updateContributionStatus(paymentId, 'completed');
    window.history.replaceState({}, '', window.location.pathname);
    
    // Update the row in memory
    const row = (window._contributionRows || []).find(r => r.id === paymentId);
    if (row) row.status = 'completed';
    renderTable(document.getElementById('contribution-filter')?.value || 'all');
    
    // Show banner after render
    showPaymentBanner('success');
  } catch (err) {
    console.warn('Could not auto-confirm payment:', err.message);
    showPaymentBanner('error');
  }
}

function showPaymentBanner(type) {
  const existing = document.getElementById('payment-banner');
  if (existing) existing.remove();

  const config = {
    success: {
      bg: '#d5e8d4', border: '#82b366', icon: '✓',
      title: 'Payment Successful!',
      message: 'Your contribution has been received and marked as completed.',
    },
    cancelled: {
      bg: '#fff2cc', border: '#d6b656', icon: '⚠',
      title: 'Payment Cancelled',
      message: 'Your payment was cancelled. Your contribution is still pending.',
    },
    error: {
      bg: '#f8cecc', border: '#b85450', icon: '✗',
      title: 'Payment Error',
      message: 'Something went wrong confirming your payment. Please contact your treasurer.',
    },
  };

  const c = config[type];
  const banner = document.createElement('div');
  banner.id = 'payment-banner';
  banner.style.cssText = [
    'background:' + c.bg,
    'border:1.5px solid ' + c.border,
    'border-radius:10px',
    'padding:1rem 1.25rem',
    'margin:1rem 0 1.5rem',
    'display:flex',
    'align-items:flex-start',
    'gap:0.75rem',
    'position:relative',
    'z-index:100',
  ].join(';');

  banner.innerHTML =
    '<span style="font-size:1.4rem;line-height:1;">' + c.icon + '</span>' +
    '<div style="flex:1;">' +
      '<strong style="display:block;font-size:.95rem;margin-bottom:.2rem;">' + c.title + '</strong>' +
      '<span style="font-size:.85rem;color:#444;">' + c.message + '</span>' +
    '</div>' +
    '<button onclick="document.getElementById(&quot;payment-banner&quot;).remove()" ' +
      'style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:#888;padding:0;">✕</button>';
  // Try multiple insertion points
  const targets = [
    document.querySelector('.page-header'),
    document.querySelector('main'),
    document.querySelector('.main-content'),
    document.querySelector('.content'),
    document.body,
  ];
  for (const target of targets) {
    if (target) {
      target.insertBefore(banner, target.firstChild);
      break;
    }
  }

  // Auto remove after 10 seconds
  setTimeout(() => { const b = document.getElementById('payment-banner'); if (b) b.remove(); }, 10000);
}

// ── Treasurer actions ────────────────────────────────────────

window.confirmContribution = async function(id, memberName) {
  try {
    await updateContributionStatus(id, 'completed');
    showToast(`Contribution confirmed for ${memberName} ✓`, 'success');

    // Update row in memory
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

// ── Record contribution form (treasurer) ─────────────────────

async function injectRecordForm() {
  const container = document.getElementById('record-contribution-section');
  if (!container) return;

  // Populate group dropdown
  const groups = await getMyGroups();

  container.innerHTML = `
    <article class="card" style="margin-bottom:1.5rem;">
      <header class="card-header">
        <h3 class="card-title">Record Contribution</h3>
        <p style="font-size:.85rem;color:var(--slate-500);margin:0;">Manually record a cash or offline payment.</p>
      </header>
      <form id="record-contribution-form" style="display:grid;gap:1rem;max-width:540px;">
        <div>
          <label class="form-label">Group</label>
          <select id="rc-group" class="form-input" required onchange="window.loadMembersForRC(this.value)">
            <option value="">Select group…</option>
            ${groups.map(g => `<option value="${g.id}" data-amount="${g.contribution_amount}">${escHtml(g.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Member</label>
          <select id="rc-member" class="form-input" required>
            <option value="">Select group first…</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div>
            <label class="form-label">Amount (ZAR)</label>
            <input type="number" id="rc-amount" class="form-input" placeholder="500" required>
          </div>
          <div>
            <label class="form-label">Due Date</label>
            <input type="date" id="rc-date" class="form-input" required>
          </div>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select id="rc-status" class="form-input">
            <option value="completed">Completed (paid)</option>
            <option value="pending">Pending</option>
            <option value="late">Late</option>
            <option value="missed">Missed</option>
          </select>
        </div>
        <div>
          <button type="submit" class="btn btn-primary">Record Contribution</button>
        </div>
      </form>
    </article>`;

  const form = document.getElementById('record-contribution-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Recording…';

      try {
        const groupId = document.getElementById('rc-group').value;
        const userId  = document.getElementById('rc-member').value;
        const amount  = document.getElementById('rc-amount').value;
        const dueDate = document.getElementById('rc-date').value;
        const status  = document.getElementById('rc-status').value;

        if (!groupId || !userId || !amount || !dueDate) {
          showToast('Please fill in all fields.', 'error');
          return;
        }

        await recordContribution({ groupId, userId, amount, dueDate, status });
        showToast('Contribution recorded!', 'success');
        form.reset();

        // Refresh the contributions table
        const contributions = await getAllContributions();
        window._contributionRows = contributions.map(c => ({
          id: c.id, date: c.due_date || c.paid_at,
          group: c.groups?.name || '—', groupId: c.group_id,
          member: c.profiles?.full_name || '—',
          amount: c.amount, status: c.status,
        }));
        renderTable('all');
      } catch (err) {
        showToast('Failed to record: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Record Contribution';
      }
    });
  }
}

// Load members into the member dropdown when group changes
window.loadMembersForRC = async function(groupId) {
  const memberSelect = document.getElementById('rc-member');
  const amountInput  = document.getElementById('rc-amount');
  if (!memberSelect) return;

  memberSelect.innerHTML = '<option value="">Loading…</option>';

  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (!data?.length) {
    memberSelect.innerHTML = '<option value="">No members found</option>';
    return;
  }

  const userIds = data.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name').in('id', userIds);

  memberSelect.innerHTML = (profiles ?? [])
    .map(p => `<option value="${p.id}">${escHtml(p.full_name || p.id)}</option>`)
    .join('');

  // Auto-fill amount from group
  const groupSelect = document.getElementById('rc-group');
  const amount = groupSelect?.selectedOptions[0]?.dataset?.amount;
  if (amount && amountInput) amountInput.value = amount;
};

// ── Helpers ──────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Run on load
checkPayFastReturn();
