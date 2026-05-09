// ============================================================
// payouts.js
// Payout schedule management for Treasurer/Admin.
// Members see a read-only view of their position.
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
  await loadGroupSelector();
}

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
      <div class="table-container"><table>
        <thead><tr>
          <th>#</th><th>Member</th><th>Estimated Date</th>
          <th style="text-align:right;">Amount</th><th>Status</th>
          ${isTreasurer ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${schedule.map(row => {
            const isMe  = row.user_id === myId;
            const badge = row.status === 'paid' ? 'badge-success' : row.status === 'skipped' ? 'badge-error' : 'badge-warning';
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
                    <button class="btn btn-ghost btn-sm" style="color:var(--forest-green);"
                      onclick="window.markPaid('${row.id}','${groupId}','${contributionAmount}')">Mark Paid</button>` : '—'}
                </td>` : ''}
              </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
    if (isTreasurer) await loadMembersForEditor(groupId, schedule);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red-600);">Could not load schedule: ${err.message}</p>`;
  }
}

async function loadMembersForEditor(groupId, existingSchedule) {
  const editorList = document.getElementById('payout-order-list');
  if (!editorList) return;
  const { data, error } = await supabase
    .from('group_members').select('user_id').eq('group_id', groupId);
  if (error || !data?.length) {
    editorList.innerHTML = '<li style="color:var(--slate-400);padding:.5rem;">No members found.</li>';
    return;
  }
  const userIds = data.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, email').in('id', userIds);
  const profileMap = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;
  const dataWithProfiles = data.map(m => ({ ...m, profiles: profileMap[m.user_id] || null }));
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
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        const amount = group?.contribution_amount || 0;
        await savePayoutSchedule(groupId, orderedIds, amount, dataWithProfiles.length);
        showToast('Payout order saved!', 'success');
        await loadPayoutSchedule(groupId, amount);
      } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false; saveBtn.textContent = 'Save Payout Order';
      }
    };
  }
}

function enableDragSort(list) {
  let dragging = null;
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('li');
    if (!li) return;
    dragging = li; li.style.opacity = '0.5';
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
    [...list.querySelectorAll('li')].forEach((el, i) => {
      el.querySelector('span').textContent = (i + 1) + '.';
    });
  });
  document.addEventListener('mouseup', () => {
    if (dragging) { dragging.style.opacity = ''; dragging = null; }
  });
}

window.markPaid = async function(payoutId, groupId, contributionAmount) {
  if (!confirm('Mark this payout as paid?')) return;
  try {
    await markPayoutPaid(payoutId);
    showToast('Payout marked as paid!', 'success');
    await loadPayoutSchedule(groupId, contributionAmount);
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
};

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
export { escHtml, capitalize, getRole, getUserId };