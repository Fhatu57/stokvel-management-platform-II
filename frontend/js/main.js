// ==================== INITIALIZE ====================
// Single ES module entry point. Each HTML page loads only this file:
//   <script type="module" src="js/main.js"></script>
console.log("THE SWITCHBOARD IS AWAKE!");
import { checkAuth, initLoginPage, logout } from './auth.js';
import { initDashboard }         from './admin-dashboard.js';
import { initTreasurerDashboard, initMemberDashboard, initMyGroups } from './dashboards.js';
import { initCreateGroup }       from './groups.js';
import { initInviteMembers }     from './invites.js';
import { initContributions }     from './contributions.js';

// Expose logout globally so HTML onclick="logout()" works
window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  console.log("Current Page detected as:", currentPage); // ADD THIS LINE

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
      initTreasurerDashboard();
      break;
    case 'member-dashboard.html':
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
  }
});
