// ==================== ADMIN DASHBOARD ====================
import { formatCurrency, formatDate } from './utils.js';
import { showToast } from './utils.js';
import { supabase, getMyGroups } from './supabase-client.js';

export async function initDashboard() {
  await Promise.all([renderGroups(), renderMemberRolePanel()]);
}

async function renderGroups() {
  const groupsContainer = document.getElementById('groups-grid');
  const statsContainer  = document.getElementById('stats-grid');
  if (!groupsContainer) return;

  groupsContainer.innerHTML = `<p style="padding:1.5rem;color:var(--slate-400);">Loading groups…</p>`;

  let groups   = [];
  let errorMsg = null;

  try {
    const raw = await getMyGroups();
    groups = raw.map(g => ({
      id:           g.id,
      name:         g.name,
      members:      Array.isArray(g.group_members) ? g.group_members.length : 0,
      contribution: g.contribution_amount,
      frequency:    g.frequency,
      totalSavings: 0,
      nextPayout:   g.next_payout || null,
      status:       g.status || 'active',
    }));
  } catch (err) {
    console.error('getMyGroups error:', err);
    errorMsg = err.message;
  }

  if (statsContainer) {
    const totalMembers = groups.reduce((s, g) => s + g.members, 0);
    const totalSavings = groups.reduce((s, g) => s + g.totalSavings, 0);
    statsContainer.innerHTML = `
      <article class="stat-card" data-testid="stat-total-members">
        <figure class="stat-card-icon green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </figure>
        <strong class="stat-value">${totalMembers}</strong>
        <p class="stat-label">Total Members</p>
      </article>
      <article class="stat-card" data-testid="stat-total-savings">
        <figure class="stat-card-icon blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </figure>
        <strong class="stat-value">${formatCurrency(totalSavings)}</strong>
        <p class="stat-label">Total Savings</p>
      </article>
      <article class="stat-card" data-testid="stat-active-groups">
        <figure class="stat-card-icon amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </figure>
        <strong class="stat-value">${groups.length}</strong>
        <p class="stat-label">Active Groups</p>
      </article>
    `;
  }

  if (errorMsg) {
    groupsContainer.innerHTML = `
      <aside class="alert alert-error" style="margin:1.5rem;">
        <p><strong>Could not load groups:</strong> ${errorMsg}</p>
        <p style="font-size:.85rem;margin-top:.5rem;">Check your Supabase RLS policies and ensure you are authenticated.</p>
      </aside>`;
    return;
  }

  if (groups.length === 0) {
    groupsContainer.innerHTML = `
      <section class="empty-state" style="padding:2rem;">
        <h3>No groups yet</h3>
        <p>Create your first stokvel group to get started.</p>
        <a href="create-group.html" class="btn btn-primary" style="margin-top:1rem;">Create Group</a>
      </section>`;
    return;
  }

  groupsContainer.innerHTML = groups.map(g => `
    <article class="group-card" data-testid="group-card-${g.id}">
      <header class="group-card-header">
        <section>
          <h3 class="group-name">${g.name}</h3>
          <mark class="badge badge-success">${g.status}</mark>
        </section>
      </header>
      <ul class="group-meta">
        <li class="group-meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
          </svg>
          ${g.members} member${g.members !== 1 ? 's' : ''}
        </li>
        <li class="group-meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          ${formatCurrency(g.contribution)} / ${g.frequency}
        </li>
        ${g.nextPayout ? `
        <li class="group-meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Next payout: ${formatDate(g.nextPayout)}
        </li>` : ''}
      </ul>
    </article>
  `).join('');
}

// ==================== MEMBER ROLE MANAGEMENT ====================
async function renderMemberRolePanel() {
  const panel = document.getElementById('role-management-panel');
  if (!panel) return;

  try {
    // Run both queries in parallel
    const [{ data: members, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (e1) throw e1;

    const roleMap = {};
    (roles || []).forEach(r => { roleMap[r.user_id] = r.role; });

    if (!members || members.length === 0) {
      panel.innerHTML = `<p style="color:var(--slate-400);font-size:.9rem;padding:1rem 0;">No members found yet.</p>`;
      return;
    }

    panel.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--slate-200);">
            <th style="text-align:left;padding:.6rem .5rem;font-size:.85rem;">Name</th>
            <th style="text-align:left;padding:.6rem .5rem;font-size:.85rem;">Email</th>
            <th style="text-align:left;padding:.6rem .5rem;font-size:.85rem;">Role</th>
            <th style="text-align:left;padding:.6rem .5rem;font-size:.85rem;">Change Role</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(m => {
            const role = roleMap[m.id] || 'member';
            return `
              <tr style="border-bottom:1px solid var(--slate-100);">
                <td style="padding:.6rem .5rem;font-size:.9rem;">${m.full_name || '—'}</td>
                <td style="padding:.6rem .5rem;font-size:.85rem;color:var(--slate-500);">${m.email || '—'}</td>
                <td style="padding:.6rem .5rem;">
                  <mark class="badge ${role === 'admin' ? 'badge-success' : role === 'treasurer' ? 'badge-warning' : ''}">${role}</mark>
                </td>
                <td style="padding:.6rem .5rem;">
                  ${role === 'admin'
                    ? '<span style="color:var(--slate-400);font-size:.85rem;">—</span>'
                    : `<select class="form-select" style="width:auto;font-size:.85rem;" onchange="assignRole('${m.id}', this.value)">
                        <option value="member"    ${role === 'member'    ? 'selected' : ''}>Member</option>
                        <option value="treasurer" ${role === 'treasurer' ? 'selected' : ''}>Treasurer</option>
                       </select>`
                  }
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    panel.innerHTML = `<p style="color:var(--slate-400);font-size:.9rem;padding:1rem 0;">Could not load members: ${err.message}</p>`;
  }
}

window.assignRole = async function(userId, newRole) {
  try {
    const { error } = await supabase.rpc('set_user_role', {
      _target_user_id: userId,
      _new_role: newRole,
    });
    if (error) throw error;
    showToast(`Role updated to ${newRole}`);
  } catch (err) {
    showToast('Failed to update role: ' + err.message, 'error');
    renderMemberRolePanel();
  }
};
