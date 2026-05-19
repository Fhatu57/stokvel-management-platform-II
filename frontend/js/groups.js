// ==================== CREATE GROUP ====================
import { createGroup } from './supabase-client.js';
import { showToast } from './utils.js';

export function initCreateGroup() {
  const form = document.getElementById('create-group-form');

  if (!form) {
    console.error('initCreateGroup: form #create-group-form not found in HTML');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name               = form.querySelector('#groupName')?.value.trim();
    const contributionAmount = parseFloat(form.querySelector('#contribution')?.value);
    const frequency          = form.querySelector('#frequency')?.value;
    const description        = form.querySelector('#description')?.value.trim() || '';

    if (!name) {
      showToast('Please enter a group name', 'error');
      return;
    }
    if (!contributionAmount || isNaN(contributionAmount) || contributionAmount <= 0) {
      showToast('Please enter a valid contribution amount', 'error');
      return;
    }
    if (!frequency) {
      showToast('Please select a contribution frequency', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
    }

    try {
      await createGroup({ name, description, contributionAmount, frequency, maxMembers: 20 });

      showToast('Group created successfully!');
      setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1000);

    } catch (err) {
      console.error('createGroup failed:', err.message);
      showToast('Error: ' + err.message, 'error');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Group';
      }
    }
  });
}
