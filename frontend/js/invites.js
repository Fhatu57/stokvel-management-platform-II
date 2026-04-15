// ==================== INVITE MEMBERS WITH ROLE ====================
import { sendInvitation, getGroupInvitations, getMyGroups } from './supabase-client.js';
import { formatDate, showToast } from './utils.js';

let _groups = [];

export async function initInviteMembers() {
  await loadGroups();
  await renderInviteList();

  const form = document.getElementById('invite-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('invite-email');
      const groupSelect = document.getElementById('invite-group');
      const roleSelect = document.getElementById('invite-role');
      
      const email = emailInput.value.trim();
      const groupId = groupSelect ? groupSelect.value : null;
      const role = roleSelect ? roleSelect.value : 'member';

      if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      if (!groupId) {
        showToast('Please select a group to invite to', 'error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending...';

      try {
        // 1. Save invitation record to Supabase with the selected role
        const invite = await sendInvitation(groupId, email, role); // <-- role added

        // 2. Trigger email via Supabase Edge Function (send-invite)
        try {
          const { supabase } = await import('./supabase-client.js');
          await supabase.functions.invoke('send-invite', {
            body: { invitationId: invite.id, email, groupId, role },
          });
          showToast(`Invitation sent to ${email} as ${role}`);
        } catch (fnErr) {
          console.warn('send-invite edge function not available:', fnErr.message);
          showToast(`Invitation recorded for ${email} (role: ${role}) — email pending`, 'warning');
        }

        emailInput.value = '';
        // Optionally reset role to default
        if (roleSelect) roleSelect.value = 'member';
        await renderInviteList(groupId);
      } catch (err) {
        console.error('sendInvitation error:', err);
        showToast('Failed to send invitation: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Send Invite
        `;
      }
    });
  }
}

async function loadGroups() {
  const groupSelect = document.getElementById('invite-group');
  if (!groupSelect) return;

  try {
    _groups = await getMyGroups();
    groupSelect.innerHTML = `<option value="">Select a group…</option>` +
      _groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  } catch (err) {
    console.warn('Could not load groups:', err.message);
    groupSelect.innerHTML = `<option value="">No groups available</option>`;
  }
}

async function renderInviteList(groupId) {
  const inviteList = document.getElementById('invite-list');
  if (!inviteList) return;

  const gid = groupId || (_groups.length > 0 ? _groups[0].id : null);
  if (!gid) {
    inviteList.innerHTML = `<section class="empty-state"><p>Create a group first to see invitations.</p></section>`;
    return;
  }

  inviteList.innerHTML = `<p style="color:var(--slate-400);font-size:.9rem;">Loading invitations…</p>`;

  try {
    const invites = await getGroupInvitations(gid);
    if (invites.length === 0) {
      inviteList.innerHTML = `<section class="empty-state"><p>No invitations sent yet</p></section>`;
      return;
    }
    inviteList.innerHTML = invites.map(invite => `
      <article class="invite-item" data-testid="invite-item-${invite.id}">
        <section>
          <p class="invite-email">${invite.email}</p>
          <small class="invite-date">Sent on ${formatDate(invite.created_at?.split('T')[0] || invite.sentAt)}</small>
          <br/>
          <small class="invite-role" style="color:var(--slate-500);">Role: <strong>${invite.role || 'member'}</strong></small>
        </section>
        <mark class="badge ${invite.status === 'accepted' ? 'badge-success' : 'badge-warning'}">
          ${invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
        </mark>
      </article>
    `).join('');
  } catch (err) {
    console.warn('Could not load invitations:', err.message);
    inviteList.innerHTML = `<section class="empty-state"><p>Could not load invitations.</p></section>`;
  }
}