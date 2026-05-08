// ============================================================
// meetings.js
// Meeting management for Treasurer/Admin (create, minutes)
// and read-only view for Members.
// ============================================================

import {
  getMyMeetings, getMyGroups, createMeeting,
  updateMeetingMinutes, deleteMeeting
} from './supabase-client.js';
import { formatDate, showToast } from './utils.js';

function getRole() {
  try { return JSON.parse(localStorage.getItem('stokvel_user') || '{}').role || 'member'; } catch { return 'member'; }
}

export async function initMeetings() {
  const role = getRole();
  const isTreasurer = role === 'treasurer' || role === 'admin';

  // Show/hide the schedule form based on role
  const formSection = document.getElementById('schedule-meeting-section');
  if (formSection) formSection.style.display = isTreasurer ? 'block' : 'none';

  await loadMeetings();

  if (isTreasurer) {
    await populateGroupDropdown();
    wireScheduleForm();
  }
}

async function loadMeetings() {
  const container = document.getElementById('meetings-list');
  if (!container) return;

  container.innerHTML = `<p style="color:var(--slate-400);padding:1rem 0;">Loading meetings…</p>`;

  try {
    const meetings = await getMyMeetings();

    if (!meetings.length) {
      container.innerHTML = `<p style="color:var(--slate-400);padding:1rem 0;">No meetings scheduled yet.</p>`;
      return;
    }

    const role = getRole();
    const isTreasurer = role === 'treasurer' || role === 'admin';
    const now = new Date();

    // Split into upcoming and past
    const upcoming = meetings.filter(m => new Date(m.scheduled_at) >= now);
    const past     = meetings.filter(m => new Date(m.scheduled_at) < now);

    container.innerHTML = '';

    if (upcoming.length) {
      container.innerHTML += `<h4 style="margin:0 0 .75rem;font-size:14px;color:var(--slate-500);text-transform:uppercase;letter-spacing:.04em;">Upcoming</h4>`;
      container.innerHTML += upcoming.map(m => renderMeetingCard(m, isTreasurer, false)).join('');
    }

    if (past.length) {
      container.innerHTML += `<h4 style="margin:1.5rem 0 .75rem;font-size:14px;color:var(--slate-500);text-transform:uppercase;letter-spacing:.04em;">Past meetings</h4>`;
      container.innerHTML += past.map(m => renderMeetingCard(m, isTreasurer, true)).join('');
    }

  } catch (err) {
    container.innerHTML = `<p style="color:var(--red-600);">Could not load meetings: ${err.message}</p>`;
  }
}

function renderMeetingCard(m, isTreasurer, isPast) {
  const dateStr  = new Date(m.scheduled_at).toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr  = new Date(m.scheduled_at).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit',
  });
  const groupName = m.groups?.name || '';

  return `
    <article class="card" style="margin-bottom:1rem;padding:1.25rem;" data-meeting-id="${m.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;">
        <div>
          <h3 style="font-size:1rem;font-weight:500;margin:0 0 .25rem;">${escHtml(m.title)}</h3>
          ${groupName ? `<span style="font-size:.8rem;color:var(--slate-500);">${escHtml(groupName)}</span>` : ''}
        </div>
        <mark class="badge ${isPast ? 'badge-warning' : 'badge-success'}" style="flex-shrink:0;">
          ${isPast ? 'Past' : 'Upcoming'}
        </mark>
      </div>

      <ul style="list-style:none;padding:0;margin:.75rem 0 0;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;">
        <li style="font-size:.85rem;color:var(--slate-600);">📅 ${dateStr}</li>
        <li style="font-size:.85rem;color:var(--slate-600);">🕐 ${timeStr}</li>
        ${m.location ? `<li style="font-size:.85rem;color:var(--slate-600);">📍 ${escHtml(m.location)}</li>` : ''}
      </ul>

      ${m.agenda ? `
        <details style="margin-top:.75rem;">
          <summary style="font-size:.85rem;font-weight:500;cursor:pointer;color:var(--slate-700);">Agenda</summary>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:.82rem;color:var(--slate-600);margin:.5rem 0 0;padding:.5rem;background:var(--slate-50);border-radius:6px;">${escHtml(m.agenda)}</pre>
        </details>` : ''}

      ${m.minutes ? `
        <details style="margin-top:.5rem;" open>
          <summary style="font-size:.85rem;font-weight:500;cursor:pointer;color:var(--slate-700);">Minutes</summary>
          <pre style="white-space:pre-wrap;font-family:inherit;font-size:.82rem;color:var(--slate-600);margin:.5rem 0 0;padding:.5rem;background:var(--slate-50);border-radius:6px;">${escHtml(m.minutes)}</pre>
        </details>` : ''}

      ${isTreasurer && isPast && !m.minutes ? `
        <div style="margin-top:.75rem;">
          <textarea id="minutes-${m.id}" placeholder="Enter meeting minutes…"
            style="width:100%;min-height:80px;padding:.5rem;border:1px solid var(--slate-300);border-radius:6px;font-size:.85rem;font-family:inherit;resize:vertical;"></textarea>
          <button class="btn btn-primary btn-sm" style="margin-top:.5rem;"
            onclick="window.saveMeetingMinutes('${m.id}')">Save Minutes</button>
        </div>` : ''}

      ${isTreasurer ? `
        <button class="btn btn-ghost btn-sm" style="margin-top:.5rem;color:var(--red-600);"
          onclick="window.deleteMeetingById('${m.id}')">Delete</button>` : ''}
    </article>`;
}

async function populateGroupDropdown() {
  const select = document.getElementById('meeting-group-id');
  if (!select) return;
  try {
    const groups = await getMyGroups();
    select.innerHTML = groups.length
      ? groups.map(g => `<option value="${g.id}">${escHtml(g.name)}</option>`).join('')
      : '<option value="">No groups found</option>';
  } catch (err) {
    console.error('populateGroupDropdown:', err.message);
  }
}

function wireScheduleForm() {
  const form = document.getElementById('schedule-meeting-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Scheduling…';

    try {
      const groupId    = document.getElementById('meeting-group-id').value;
      const title      = document.getElementById('meeting-title').value;
      const dateVal    = document.getElementById('meeting-date').value;
      const timeVal    = document.getElementById('meeting-time').value || '09:00';
      const location   = document.getElementById('meeting-location')?.value || '';
      const agenda     = document.getElementById('meeting-agenda')?.value || '';

      if (!groupId || !title || !dateVal) {
        showToast('Please fill in group, title, and date.', 'error');
        return;
      }

      const scheduledAt = new Date(`${dateVal}T${timeVal}`).toISOString();

      await createMeeting({ groupId, title, scheduledAt, location, agenda });
      showToast('Meeting scheduled!', 'success');
      form.reset();
      await loadMeetings();
    } catch (err) {
      showToast('Failed to schedule meeting: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Schedule Meeting';
    }
  });
}

// ── Global actions (called from inline onclick) ──────────────

window.saveMeetingMinutes = async function(meetingId) {
  const textarea = document.getElementById(`minutes-${meetingId}`);
  if (!textarea || !textarea.value.trim()) {
    showToast('Please enter minutes before saving.', 'error');
    return;
  }
  try {
    await updateMeetingMinutes(meetingId, textarea.value);
    showToast('Minutes saved!', 'success');
    await loadMeetings();
  } catch (err) {
    showToast('Failed to save minutes: ' + err.message, 'error');
  }
};

window.deleteMeetingById = async function(meetingId) {
  if (!confirm('Delete this meeting?')) return;
  try {
    await deleteMeeting(meetingId);
    showToast('Meeting deleted.', 'success');
    await loadMeetings();
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
};

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
