// ============================================================
// main.js — single entry point for all pages.
// Each HTML page loads: <script type="module" src="js/main.js">
// ============================================================

import { checkAuth, initLoginPage, logout } from './auth.js';
import { initDashboard }                    from './admin-dashboard.js';
import { initTreasurerDashboard, initMemberDashboard, initMyGroups } from './dashboards.js';
import { initCreateGroup }                  from './groups.js';
import { initInviteMembers }                from './invites.js';
import { initContributions }                from './contributions.js';
import { initMeetings }                     from './meetings.js';
import { initPayouts }                      from './payouts.js';
import { initAnalytics }                    from './analytics.js';
import { initProfile }                      from './profile.js';
import { initNotifications }                from './notifications.js';

window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage !== 'index.html' && currentPage !== '') {
    checkAuth();
  }

  switch (currentPage) {
    case 'index.html':
    case '':
      initLoginPage();
      break;
    case 'admin-dashboard.html':
    case 'admin-dashboard':
      initDashboard();
      break;
    case 'treasurer-dashboard.html':
    case 'treasurer-dashboard':
      initTreasurerDashboard();
      break;
    case 'member-dashboard.html':
    case 'member-dashboard':
      initMemberDashboard();
      break;
    case 'create-group.html':
    case 'create-group':
      initCreateGroup();
      break;
    case 'invite-members.html':
    case 'invite-members':
      initInviteMembers();
      break;
    case 'contributions.html':
    case 'contributions':
      initContributions();
      break;
    case 'my-groups.html':
    case 'my-groups':
      initMyGroups();
      break;
    case 'meetings.html':
    case 'meetings':
      initMeetings();
      break;
    case 'payouts.html':
    case 'payouts':
      initPayouts();
      break;
    case 'analytics.html':
    case 'analytics':
      initAnalytics();
      break;
    case 'profile.html':
    case 'profile':
      initProfile();
      break;
    case 'notifications.html':
    case 'notifications':
      initNotifications();
      break;
  }
});
