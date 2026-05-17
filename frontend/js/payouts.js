// ============================================================
// payouts.js
// Payout schedule management for Treasurer/Admin.
// Members see a read-only view of their position.
// Sprint 4: Added disburse modal, confirmation flow.
// ============================================================

import {
  supabase, getMyGroups, getPayoutSchedule,
  savePayoutSchedule, markPayoutPaid
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

function getRole() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').role || 'member'; } catch { return 'member'; }
}
function getUserId() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').id || null; } catch { return null; }
}

export async function initPayouts() {
  const role = getRole();
  const isTreasurer = role === 'treasurer' || role === 'admin';

  const editSection = document.getElementById('payout-editor-section');
  if (editSection) editSection.style.display = isTreasurer ? 'block' : 'none';

  // Inject disburse modal into page
  injectDisburseModal();

  await loadGroupSelector();
}

// ── Disburse modal ───────────────────────────────────────────

function injectDisburseModal() {
  if (document.getElementById('disburse-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'disburse-modal';
  modal.style.cssText = `
    display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:1000;align-items:center;justify-content:center;`;
  modal.innerHTML = `
    <div style="background:var(--color-background-primary);border-radius:12px;padding:2rem;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <h3 style="font-size:1.1rem;font-weight:500;margin:0 0 .5rem;">Confirm Disbursement</h3>
      <p id="disburse-modal-text" style="color:var(--color-text-secondary);font-size:.9rem;margin:0 0 1.5rem;"></p>
      <div style="background:var(--color-background-tertiary);border-radius:8px;padding:.75rem 1rem;margin-bottom:1.5rem;font-size:.85rem;color:var(--color-text-secondary);">
        This records that the payout has been made. Ensure the member has received their funds before confirming.
      </div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="window.closeDisburseModal()">Cancel</button>
        <button class="btn btn-primary" id="disburse-confirm-btn" onclick="window.confirmDisburse()">Confirm Disbursement</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

let _pendingDisburse = null;

window.openDisburseModal = function(payoutId, groupId, amount, memberName, contributionAmount) {
  _pendingDisburse = { payoutId, groupId, contributionAmount };
  const modal = document.getElementById('disburse-modal');
  const text  = document.getElementById('disburse-modal-text');
  if (text) text.textContent = `Disburse ${formatCurrency(amount)} to ${memberName}?`;
  if (modal) modal.style.display = 'flex';
};

window.closeDisburseModal = function() {
  const modal = document.getElementById('disburse-modal');
  if (modal) modal.style.display = 'none';
  _pendingDisburse = null;
};

window.confirmDisburse = async function() {
  if (!_pendingDisburse) return;
  const btn = document.getElementById('disburse-confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';
  try {
    const { payoutId, groupId, contributionAmount } = _pendingDisburse;
    await markPayoutPaid(payoutId);
    showToast('Disbursement recorded successfully!', 'success');
    window.closeDisburseModal();
    await loadPayoutSchedule(groupId, contributionAmount);
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Disbursement';
  }
};

// ── Group selector ───────────────────────────────────────────

async function loadGroupSelector() {
  const select = document.getElementById('payout-group-select');
  if (!select) return;

  try {
    const groups = await getMyGroups();
    if (!groups.length) return;

    select.innerHTML = groups.map(g =>
      `<option value="${g.id}" data-amount="${g.contribution_amount}">${escHtml(g.name)}</option>`
    ).join('');

    select.addEventListener('change', () =>
      loadPayoutSchedule(select.value, select.selectedOptions[0]?.dataset?.amount)
    );

    await loadPayoutSchedule(groups[0].id, groups[0].contribution_amount);
  } catch (err) {
    showToast('Could not load groups: ' + err.message, 'error');
  }
}

// ── Payout schedule table ────────────────────────────────────

async function loadPayoutSchedule(groupId, contributionAmount) {
  const container   = document.getElementById('payout-schedule-list');
  const myId        = getUserId();
  const role        = getRole();
  const isTreasurer = role === 'treasurer' || role === 'admin';

  if (!container) return;
  container.innerHTML = `<p style="color:var(--slate-400);padding:1rem 0;">Loading payout schedule…</p>`;

  try {
    const schedule = await getPayoutSchedule(groupId);

    if (!schedule.length) {
      container.innerHTML = isTreasurer
        ? `<p style="color:var(--slate-400);">No payout schedule set. Use the editor below to define the order.</p>`
        : `<p style="color:var(--slate-400);">Payout schedule not yet configured by your treasurer.</p>`;
      if (isTreasurer) await loadMembersForEditor(groupId, []);
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Member</th><th>Estimated Date</th>
              <th style="text-align:right;">Amount</th><th>Status</th>
              ${isTreasurer ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${schedule.map(row => {
              const isMe  = row.user_id === myId;
              const badge = row.status === 'paid' ? 'badge-success'
                          : row.status === 'skipped' ? 'badge-error' : 'badge-warning';
              const name  = row.profiles?.full_name || '—';
              return `
                <tr style="${isMe ? 'background:var(--emerald-50);font-weight:500;' : ''}">
                  <td>${row.position}</td>
                  <td>${escHtml(name)}${isMe ? ' <mark class="badge badge-success" style="font-size:.7rem;">You</mark>' : ''}</td>
                  <td>${row.scheduled_date ? formatDate(row.scheduled_date) : '—'}</td>
                  <td class="amount-cell">${row.amount ? formatCurrency(row.amount) : '—'}</td>
                  <td><mark class="badge ${badge}">${capitalize(row.status)}</mark></td>
                  ${isTreasurer ? `<td>
                    ${row.status === 'pending' ? `
                      <button class="btn btn-primary btn-sm"
                        onclick="window.openDisburseModal('${row.id}','${groupId}',${row.amount},'${escHtml(name)}','${contributionAmount}')">
                        Disburse
                      </button>` : '—'}
                  </td>` : ''}
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    if (isTreasurer) await loadMembersForEditor(groupId, schedule);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red-600);">Could not load schedule: ${err.message}</p>`;
  }
}

// ── Member editor (drag to reorder) ─────────────────────────

async function loadMembersForEditor(groupId, existingSchedule) {
  const editorList = document.getElementById('payout-order-list');
  if (!editorList) return;

  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (error || !data?.length) {
    editorList.innerHTML = '<li style="color:var(--slate-400);padding:.5rem;">No members found.</li>';
    return;
  }

  // Fetch profiles separately
  const userIds = data.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, email').in('id', userIds);

  const profileMap = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;

  const dataWithProfiles = data.map(m => ({
    ...m, profiles: profileMap[m.user_id] || null,
  }));

  const groups = await getMyGroups();
  const group  = groups.find(g => g.id === groupId);

  const sorted = [...dataWithProfiles].sort((a, b) => {
    const posA = existingSchedule.find(s => s.user_id === a.user_id)?.position ?? 999;
    const posB = existingSchedule.find(s => s.user_id === b.user_id)?.position ?? 999;
    return posA - posB;
  });

  editorList.innerHTML = sorted.map((m, i) => `
    <li data-user-id="${m.user_id}"
      style="display:flex;align-items:center;gap:.75rem;padding:.6rem .75rem;background:var(--color-background-secondary);border:1px solid var(--color-border-tertiary);border-radius:8px;margin-bottom:.4rem;cursor:grab;">
      <span style="font-size:.9rem;color:var(--slate-400);min-width:1.5rem;">${i + 1}.</span>
      <span style="flex:1;font-size:.9rem;">${m.profiles?.full_name || m.user_id}</span>
      <span style="color:var(--slate-300);">⠿</span>
    </li>`).join('');

  enableDragSort(editorList);

  const saveBtn = document.getElementById('save-payout-order-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const orderedIds = [...editorList.querySelectorAll('li')].map(li => li.dataset.userId);
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        const amount = group?.contribution_amount || 0;
        await savePayoutSchedule(groupId, orderedIds, amount, dataWithProfiles.length);
        showToast('Payout order saved!', 'success');
        await loadPayoutSchedule(groupId, amount);
      } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Payout Order';
      }
    };
  }
}

// ── Drag sort ────────────────────────────────────────────────

function enableDragSort(list) {
  let dragging = null;

  list.addEventListener('mousedown', e => {
    const li = e.target.closest('li');
    if (!li) return;
    dragging = li;
    li.style.opacity = '0.5';
  });

  list.addEventListener('mouseover', e => {
    if (!dragging) return;
    const li = e.target.closest('li');
    if (!li || li === dragging) return;
    const rect = li.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    if (e.clientY < mid) list.insertBefore(dragging, li);
    else if (li.nextSibling) list.insertBefore(dragging, li.nextSibling);
    else list.appendChild(dragging);
    // Update position numbers
    [...list.querySelectorAll('li')].forEach((el, i) => {
      el.querySelector('span').textContent = (i + 1) + '.';
    });
  });

  document.addEventListener('mouseup', () => {
    if (dragging) { dragging.style.opacity = ''; dragging = null; }
  });
}

// ── Helpers ──────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
