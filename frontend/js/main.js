// ==================== INITIALIZE ====================
// Single ES module entry point. Each HTML page loads only this file:
//   <script type="module" src="js/main.js"></script>

import { checkAuth, initLoginPage, logout } from './auth.js';
import { initDashboard }         from './admin-dashboard.js';
import { initTreasurerDashboard, initMemberDashboard } from './dashboards.js';
import { initCreateGroup }       from './groups.js';
import { initInviteMembers }     from './invites.js';
import { initContributions }     from './contributions.js';

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // Wire logout button via event listener (works with ES modules, unlike onclick="")
  const logoutBtn = document.querySelector('[data-testid="logout-btn"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logout());
  }

  if (currentPage !== 'index.html' && currentPage !== '') {
    checkAuth();
  }

  switch (currentPage) {
    case 'index.html':
    case '':
      initLoginPage();
      break;
    case 'admin-dashboard.html':
      initDashboard();
      break;
    case 'treasurer-dashboard.html':
      initTreasurerDashboard();
      break;
    case 'member-dashboard.html':
      initMemberDashboard();
      break;
    case 'create-group.html':
      initCreateGroup();
      break;
    case 'invite-members.html':
      initInviteMembers();
      break;
    case 'contributions.html':
      initContributions();
      break;
  }
});
