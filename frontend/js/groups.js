// ==================== CREATE GROUP ====================
import { createGroup } from './supabase-client.js';
import { showToast } from './utils.js';

export function initCreateGroup() {
  const form = document.getElementById('create-group-form');
  const submitBtn = document.getElementById('create-group-btn');

  if (!form || !submitBtn) {
    console.error('Create group form or button not found');
    return;
  }

  submitBtn.addEventListener('click', async () => {
    const name               = document.getElementById('groupName')?.value.trim();
    const contributionAmount = parseFloat(document.getElementById('contribution')?.value);
    const frequency          = document.getElementById('frequency')?.value;
    const startDate          = document.getElementById('startDate')?.value || null;
    const description        = document.getElementById('description')?.value.trim() || '';

    // Validation
    if (!name) {
      showToast('Please enter a group name', 'error');
      return;
    }
    if (!contributionAmount || contributionAmount < 100) {
      showToast('Minimum contribution is R100', 'error');
      return;
    }
    if (!frequency) {
      showToast('Please select a contribution frequency', 'error');
      return;
    }
    if (!startDate) {
      showToast('Please select a start date', 'error');
      return;
    }

    const frequencyNormalised = frequency.toLowerCase();

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating...';

    try {
      console.log('Creating group with data:', {
        name,
        description,
        contributionAmount,
        frequency: frequencyNormalised,
        maxMembers: 20,
        startDate,
      });

      const result = await createGroup({
        name,
        description,
        contributionAmount,
        frequency: frequencyNormalised,
        maxMembers: 20,
        startDate,
      });

      console.log('Group created successfully:', result);
      showToast('Group created successfully!');
      
      setTimeout(() => { 
        window.location.href = 'admin-dashboard.html'; 
      }, 1500);
      
    } catch (err) {
      console.error('createGroup error details:', err);
      
      // Show more helpful error messages
      let errorMessage = err?.message || 'Unknown error';
      
      if (errorMessage.includes('permission denied') || errorMessage.includes('violates row-level security')) {
        errorMessage = 'You do not have admin permissions to create a group. Please contact your system administrator.';
      } else if (errorMessage.includes('duplicate key')) {
        errorMessage = 'A group with this name already exists.';
      }
      
      showToast('Error: ' + errorMessage, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Create Group
      `;
    }
  });
}