// ============================================================
// profile.js
// User profile page — view/edit name, see stats and groups.
// Sprint 4: New page
// ============================================================

import {
  getCurrentUser, getProfile, getMyGroups,
  getMyContributions, supabase
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

function getRole() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').role || 'member'; } catch { return 'member'; }
}

export async function initProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const profile = await getProfile(user.id);
    renderProfile(profile);
    await loadStats(user.id);
    await loadGroups();
    setupForm(profile);
  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'error');
  }
}

function renderProfile(profile) {
  const name  = profile?.full_name || 'Unknown';
  const email = profile?.email || '—';
  const role  = getRole();
  const since = profile?.created_at ? formatDate(profile.created_at) : '—';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

  // Avatar circle
  const av = document.getElementById('profile-avatar-circle');
  if (av) av.textContent = initials;

  // Sidebar
  const sav = document.getElementById('sidebar-avatar');
  if (sav) sav.textContent = initials;
  const sname = document.getElementById('sidebar-name');
  if (sname) sname.textContent = name;
  const srole = document.getElementById('sidebar-role');
  if (srole) srole.textContent = role;

  // Profile details
  const elName  = document.getElementById('profile-name');
  const elEmail = document.getElementById('profile-email');
  const elBadge = document.getElementById('profile-role-badge');
  if (elName)  elName.textContent  = name;
  if (elEmail) elEmail.textContent = email;
  if (elBadge) {
    elBadge.textContent = role;
    elBadge.className = 'badge ' + (role === 'admin' ? 'badge-error' : role === 'treasurer' ? 'badge-warning' : 'badge-success');
  }

  // Form fields
  const pfName  = document.getElementById('pf-name');
  const pfEmail = document.getElementById('pf-email');
  const pfRole  = document.getElementById('pf-role');
  const pfSince = document.getElementById('pf-since');
  if (pfName)  pfName.value  = name;
  if (pfEmail) pfEmail.value = email;
  if (pfRole)  pfRole.value  = role.charAt(0).toUpperCase() + role.slice(1);
  if (pfSince) pfSince.value = since;
}

async function loadStats(userId) {
  try {
    const contributions = await getMyContributions();
    const groups        = await getMyGroups();

    const completed = contributions.filter(c => c.status === 'completed');
    const total     = contributions.reduce((s, c) => s + Number(c.amount || 0), 0);
    const compliance = contributions.length
      ? Math.round((completed.length / contributions.length) * 100)
      : 0;

    const elTotal      = document.getElementById('stat-total');
    const elCompliance = document.getElementById('stat-compliance');
    const elGroups     = document.getElementById('stat-groups');
    const elPayments   = document.getElementById('stat-payments');

    if (elTotal)      elTotal.textContent      = formatCurrency(total);
    if (elCompliance) elCompliance.textContent  = compliance + '%';
    if (elGroups)     elGroups.textContent      = groups.length;
    if (elPayments)   elPayments.textContent    = completed.length;
  } catch (err) {
    console.warn('Could not load stats:', err.message);
  }
}

async function loadGroups() {
  const container = document.getElementById('profile-groups-list');
  if (!container) return;

  try {
    const groups = await getMyGroups();
    if (!groups.length) {
      container.innerHTML = '<p style="color:var(--slate-400);font-size:.85rem;">Not a member of any group yet.</p>';
      return;
    }

    container.innerHTML = groups.map(g => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;background:var(--color-background-secondary);border-radius:8px;border:1px solid var(--color-border-tertiary);">
        <div>
          <p style="margin:0;font-size:.9rem;font-weight:500;">${escHtml(g.name)}</p>
          <p style="margin:0;font-size:.75rem;color:var(--slate-500);">${formatCurrency(g.contribution_amount)} / ${g.frequency}</p>
        </div>
        <mark class="badge badge-success" style="font-size:.7rem;">Active</mark>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--slate-400);font-size:.85rem;">Could not load groups.</p>';
  }
}

function setupForm(profile) {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn  = document.getElementById('save-profile-btn');
    const name = document.getElementById('pf-name')?.value?.trim();

    if (!name) { showToast('Name cannot be empty.', 'error'); return; }

    btn.disabled    = true;
    btn.textContent = 'Saving...';

    try {
      const user = await getCurrentUser();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
      stored.name = name;
      localStorage.setItem('stokvel_user', JSON.stringify(stored));

      // Update UI
      const elName = document.getElementById('profile-name');
      if (elName) elName.textContent = name;
      const sname = document.getElementById('sidebar-name');
      if (sname) sname.textContent = name;
      const av = document.getElementById('profile-avatar-circle');
      if (av) av.textContent = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Save Changes';
    }
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
