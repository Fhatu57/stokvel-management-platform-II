// ==================== INVITE MEMBERS WITH ROLE ====================
import { sendInvitation, getGroupInvitations, getMyGroups } from './supabase-client.js';
import { formatDate, showToast } from './utils.js';

// ── EmailJS config ──────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_wqsiccs';
const EMAILJS_TEMPLATE_ID = 'template_rujkh2l';
const EMAILJS_PUBLIC_KEY  = 'pD7X8Ju5I3AGhAWGy';

// ── Dummy group used while group-creation is still being built ──
// Replace this with real data once your teammate's work is merged.
const DUMMY_GROUPS = [
  { id: 'dummy-group-001', name: 'Family Savings Circle (Test)' },
];

let _groups=[];

// Load EmailJS SDK once
function loadEmailJS() {
  return new Promise((resolve) => {
    if (window.emailjs) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      resolve();
    };
    document.head.appendChild(script);
  });
}

export async function initInviteMembers() {
  await loadEmailJS();
  await loadGroups();
  await renderInviteList();

  const form = document.getElementById('invite-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput  = document.getElementById('invite-email');
    const groupSelect = document.getElementById('invite-group');
    const roleSelect  = document.getElementById('invite-role');

    const email   = emailInput.value.trim();
    const groupId = groupSelect?.value || null;
    const role    = roleSelect?.value  || 'member';

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
      // 1. Save invitation record to Supabase → get back token
      const invite = await sendInvitation(groupId, email, role);

      // 2. Build the accept link using the token
      const appBaseUrl  = window.location.origin;
      const acceptLink  = `${appBaseUrl}/accept-invite.html?token=${invite.token}`;

      // 3. Find the group name for the email
      const group = _groups.find(g => g.id === groupId);
      const groupName = group?.name || 'Stokvel Group';

      // 4. Get the inviter's name from localStorage / session
      const stored = localStorage.getItem('stokvel_user');
      const inviterName = stored
        ? (JSON.parse(stored).name || JSON.parse(stored).email || 'A StokvelConnect Admin')
        : 'A StokvelConnect Admin';

      // 5. Send email via EmailJS
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:    email,
        group_name:  groupName,
        role:        role.charAt(0).toUpperCase() + role.slice(1),
        inviter_name: inviterName,
        invite_link: acceptLink,
      });

      showToast(`Invitation sent to ${email} as ${role} ✓`);
      emailInput.value = '';
      if (roleSelect) roleSelect.value = 'member';
      await renderInviteList(groupId);

    } catch (err) {
      console.error('Invite error:', err);
      // Give a helpful message depending on where it failed
      if (err?.text) {
        // EmailJS errors have a .text property
        showToast('Email failed: ' + err.text, 'error');
      } else {
        showToast('Failed to send invitation: ' + err.message, 'error');
      }
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

async function loadGroups() {
  const groupSelect = document.getElementById('invite-group');
  if (!groupSelect) {
    console.error('Group select element not found');
    return;
  }

  console.log('Loading groups...');

  // Clear existing options first
  groupSelect.innerHTML = '<option value="">Loading groups...</option>';

  try {
    // Try to get real groups with a timeout
    let real = [];
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getMyGroups timeout')), 5000)
      );
      real = await Promise.race([getMyGroups(), timeoutPromise]);
      console.log('Real groups from DB:', real);
    } catch (err) {
      console.warn('Failed to fetch real groups:', err.message);
      real = [];
    }
    
    if (real && real.length > 0) {
      _groups = real;
      console.log('Using real groups');
    } else {
      console.log('No real groups, using dummy groups');
      _groups = DUMMY_GROUPS;
    }
  } catch (err) {
    console.error('Error loading groups:', err);
    _groups = DUMMY_GROUPS;
  }

  // Clear and repopulate dropdown
  groupSelect.innerHTML = '';
  
  if (_groups.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No groups available';
    groupSelect.appendChild(option);
    return;
  }

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a group…';
  groupSelect.appendChild(defaultOption);

  // Add all groups
  _groups.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    groupSelect.appendChild(option);
  });

  console.log('Dropdown populated with', _groups.length, 'groups');
  console.log('Current dropdown values:', Array.from(groupSelect.options).map(o => o.value));
}

// ── Render the sent invitations list ───────────────────────────
async function renderInviteList(groupId) {
  const inviteList = document.getElementById('invite-list');
  if (!inviteList) return;

  const gid = groupId || (_groups.length > 0 ? _groups[0].id : null);

  if (!gid || gid.startsWith('dummy-')) {
    inviteList.innerHTML = `
      <section class="empty-state">
        <p>Invitations will appear here once a real group is available.</p>
      </section>`;
    return;
  }

  inviteList.innerHTML = `<p style="color:var(--slate-400);font-size:.9rem;">Loading invitations…</p>`;

  try {
    const invites = await getGroupInvitations(gid);
    if (invites.length === 0) {
      inviteList.innerHTML = `<section class="empty-state"><p>No invitations sent yet.</p></section>`;
      return;
    }
    inviteList.innerHTML = invites.map(invite => `
      <article class="invite-item" data-testid="invite-item-${invite.id}">
        <section>
          <p class="invite-email">${invite.email}</p>
          <small class="invite-date">Sent on ${formatDate(invite.created_at?.split('T')[0] || '')}</small>
          <br/>
          <small class="invite-role" style="color:var(--slate-500);">
            Role: <strong>${invite.role || 'member'}</strong>
          </small>
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