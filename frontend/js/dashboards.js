// ==================== MEMBER DASHBOARD ====================
import { showToast } from './utils.js';

export function initMemberDashboard() {
  console.log('Member dashboard initialized');
}

// ==================== TREASURER DASHBOARD ====================

export function initTreasurerDashboard() {
  const recordBtn = document.querySelector('[data-testid="btn-record-contribution"]');
  const payoutBtn = document.querySelector('[data-testid="btn-schedule-payout"]');
  const reportBtn = document.querySelector('[data-testid="btn-generate-report"]');

  if (recordBtn) recordBtn.addEventListener('click', () => showToast('Record Contribution feature coming soon!'));
  if (payoutBtn) payoutBtn.addEventListener('click', () => showToast('Schedule Payout feature coming soon!'));
  if (reportBtn) reportBtn.addEventListener('click', () => showToast('Generate Report feature coming soon!'));
}
