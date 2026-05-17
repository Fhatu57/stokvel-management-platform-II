// ============================================================
// auth.js
// Handles Google sign-in, session checking, role-based nav,
// and logout. checkAuth() is called on every protected page.
// ============================================================

import { signInWithGoogle, signOut, onAuthStateChange, acceptInvitation } from './supabase-client.js';

export function initLoginPage() {
  const googleBtn = document.getElementById('google-signin-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.textContent = 'Signing in…';
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('Sign-in failed:', err);
        googleBtn.disabled = false;
        googleBtn.textContent = 'Sign in with Google';
      }
    });
  }

  onAuthStateChange(async ({ event, session, role, profile }) => {
    if (event === 'SIGNED_IN') {
      let resolvedRole = role || 'member';

      localStorage.setItem('stokvel_user', JSON.stringify({
        id:     session.user.id,
        name:   profile?.full_name || session.user.user_metadata?.full_name || '',
        email:  session.user.email,
        role:   resolvedRole,
        avatar: (profile?.full_name || session.user.user_metadata?.full_name || '??')
                  .split(' ').map(n => n[0]).join('').toUpperCase(),
      }));

      // Accept any pending invite before redirecting
      const pendingToken = localStorage.getItem('pending_invite_token');
      if (pendingToken) {
        localStorage.removeItem('pending_invite_token');
        try {
          const result = await acceptInvitation(pendingToken);
          if (result?.role) {
            resolvedRole = result.role;
            const stored = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
            stored.role = resolvedRole;
            localStorage.setItem('stokvel_user', JSON.stringify(stored));
          }
        } catch (err) {
          console.warn('Could not accept pending invitation:', err.message);
        }
      }

      switch (resolvedRole) {
        case 'admin':     window.location.href = 'admin-dashboard.html';     break;
        case 'treasurer': window.location.href = 'treasurer-dashboard.html'; break;
        default:          window.location.href = 'member-dashboard.html';    break;
      }
    }
  });
}

// ── Role-based navigation links ──────────────────────────────

const ICON = {
  dashboard:     '<rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>',
  contributions: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
  group:         '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  invite:        '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
  create:        '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>',
  payout:        '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
  meetings:      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  analytics:     '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  reports:       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  notifications: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
  profile:       '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
};

const NAV_LINKS = {
  admin: [
    { href: 'admin-dashboard.html',  label: 'Dashboard',      icon: ICON.dashboard,     testid: 'nav-dashboard' },
    { href: 'create-group.html',     label: 'Create Group',   icon: ICON.create,        testid: 'nav-create-group' },
    { href: 'invite-members.html',   label: 'Invite Members', icon: ICON.invite,        testid: 'nav-invite' },
    { href: 'contributions.html',    label: 'Contributions',  icon: ICON.contributions, testid: 'nav-contributions' },
    { href: 'meetings.html',         label: 'Meetings',       icon: ICON.meetings,      testid: 'nav-meetings' },
    { href: 'payouts.html',          label: 'Payouts',        icon: ICON.payout,        testid: 'nav-payouts' },
    { href: 'analytics.html',        label: 'Analytics',      icon: ICON.analytics,     testid: 'nav-analytics' },
    { href: 'notifications.html', label: 'Notifications', icon: ICON.notifications, testid: 'nav-notifications' },
{ href: 'profile.html',       label: 'My Profile',    icon: ICON.profile,       testid: 'nav-profile' },
  ],
  treasurer: [
    { href: 'treasurer-dashboard.html', label: 'Dashboard',      icon: ICON.dashboard,     testid: 'nav-treasurer-dashboard' },
    { href: 'contributions.html',       label: 'Contributions',  icon: ICON.contributions, testid: 'nav-contributions' },
    { href: 'my-groups.html',           label: 'My Groups',      icon: ICON.group,         testid: 'nav-my-groups' },
    { href: 'meetings.html',            label: 'Meetings',       icon: ICON.meetings,      testid: 'nav-meetings' },
    { href: 'payouts.html',             label: 'Payouts',        icon: ICON.payout,        testid: 'nav-payouts' },
    { href: 'analytics.html',           label: 'Analytics',      icon: ICON.analytics,     testid: 'nav-analytics' },
    { href: 'notifications.html', label: 'Notifications', icon: ICON.notifications, testid: 'nav-notifications' },
{ href: 'profile.html',       label: 'My Profile',    icon: ICON.profile,       testid: 'nav-profile' },
  ],
  member: [
    { href: 'member-dashboard.html', label: 'Dashboard',        icon: ICON.dashboard,     testid: 'nav-member-dashboard' },
    { href: 'contributions.html',    label: 'My Contributions', icon: ICON.contributions, testid: 'nav-my-contributions' },
    { href: 'my-groups.html',        label: 'My Groups',        icon: ICON.group,         testid: 'nav-my-groups' },
    { href: 'meetings.html',         label: 'Meetings',         icon: ICON.meetings,      testid: 'nav-meetings' },
    { href: 'payouts.html',          label: 'Payout Schedule',  icon: ICON.payout,        testid: 'nav-payout-schedule' },
    { href: 'notifications.html', label: 'Notifications', icon: ICON.notifications, testid: 'nav-notifications' },
{ href: 'profile.html',       label: 'My Profile',    icon: ICON.profile,       testid: 'nav-profile' },
  ],
};

export function checkAuth() {
  const user = JSON.parse(localStorage.getItem('stokvel_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }

  // Update sidebar user info from real session data
  const userNameEl   = document.querySelector('.user-name');
  const userRoleEl   = document.querySelector('.user-role');
  const userAvatarEl = document.querySelector('.user-avatar');
  if (userNameEl)   userNameEl.textContent   = user.name || user.email || 'User';
  if (userRoleEl)   userRoleEl.textContent   = capitalize(user.role || 'member');
  if (userAvatarEl) userAvatarEl.textContent = user.avatar || '?';

  // Rebuild nav for this role
  const navSection = document.querySelector('.sidebar-nav .nav-section');
  if (!navSection) return;

  const links      = NAV_LINKS[user.role] || NAV_LINKS.member;
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  navSection.innerHTML = `
    <p class="nav-section-title">Main Menu</p>
    ${links.map(link => `
      <a href="${link.href}" class="nav-link${currentPage === link.href ? ' active' : ''}" data-testid="${link.testid}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${link.icon}
        </svg>
        ${link.label}
      </a>`).join('')}`;
}

export function logout() {
  signOut().finally(() => {
    localStorage.removeItem('stokvel_user');
    window.location.href = 'index.html';
  });
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
