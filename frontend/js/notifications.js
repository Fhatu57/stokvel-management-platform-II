// ============================================================
// notifications.js
// Notifications page — shows recent activity log from Supabase.
// Pulls from contributions, meetings and payout_schedule tables.
// Sprint 4: New page
// ============================================================

import {
  getCurrentUser, getMyGroups, getMyContributions,
  getMyMeetings, getPayoutSchedule, supabase
} from './supabase-client.js';
import { formatCurrency, formatDate, showToast } from './utils.js';

let _allNotifs = [];

export async function initNotifications() {
  // Sidebar info
  try {
    const stored = JSON.parse(localStorage.getItem('stokvel_user') || '{}');
    const name   = stored.name || stored.email || 'User';
    const role   = stored.role || 'member';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const sav  = document.getElementById('sidebar-avatar');
    const sn   = document.getElementById('sidebar-name');
    const sr   = document.getElementById('sidebar-role');
    if (sav) sav.textContent = initials;
    if (sn)  sn.textContent  = name;
    if (sr)  sr.textContent  = role;
  } catch {}

  await loadNotifications();
}

async function loadNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--slate-400);text-align:center;padding:2rem;">Loading...</p>';

  try {
    const notifs = [];
    const groups = await getMyGroups();

    // 1. Contribution notifications
    const contributions = await getMyContributions();
    for (const c of contributions) {
      if (c.status === 'completed') {
        notifs.push({
          type: 'payment',
          icon: '💰',
          color: '#1D9E75',
          bg: '#d5e8d4',
          title: 'Payment received',
          message: `Your contribution of ${formatCurrency(c.amount)} for ${c.groups?.name || 'your group'} was marked as completed.`,
          date: c.paid_at || c.due_date || c.created_at,
        });
      } else if (c.status === 'missed') {
        notifs.push({
          type: 'payment',
          icon: '⚠️',
          color: '#b85450',
          bg: '#f8cecc',
          title: 'Missed contribution',
          message: `Your contribution of ${formatCurrency(c.amount)} for ${c.groups?.name || 'your group'} was flagged as missed.`,
          date: c.due_date || c.created_at,
        });
      } else if (c.status === 'pending' && c.due_date) {
        const due = new Date(c.due_date);
        const today = new Date(); today.setHours(0,0,0,0);
        if (due < today) {
          notifs.push({
            type: 'payment',
            icon: '🔔',
            color: '#d6b656',
            bg: '#fff2cc',
            title: 'Contribution overdue',
            message: `Your contribution of ${formatCurrency(c.amount)} for ${c.groups?.name || 'your group'} is overdue.`,
            date: c.due_date,
          });
        }
      }
    }

    // 2. Meeting notifications
    for (const group of groups) {
      try {
        const meetings = await getMyMeetings(group.id);
        for (const m of meetings || []) {
          const mDate = new Date(m.scheduled_at);
          const today = new Date(); today.setHours(0,0,0,0);
          const diff  = Math.round((mDate - today) / (1000*60*60*24));
          if (diff >= 0 && diff <= 7) {
            notifs.push({
              type: 'meeting',
              icon: '📅',
              color: '#6c8ebf',
              bg: '#dae8fc',
              title: 'Upcoming meeting',
              message: `"${m.title}" scheduled for ${formatDate(m.scheduled_at)} in ${group.name}.`,
              date: m.scheduled_at,
            });
          }
          if (m.minutes) {
            notifs.push({
              type: 'meeting',
              icon: '📝',
              color: '#6c8ebf',
              bg: '#dae8fc',
              title: 'Meeting minutes available',
              message: `Minutes from "${m.title}" have been recorded in ${group.name}.`,
              date: m.scheduled_at,
            });
          }
        }
      } catch {}
    }

    // 3. Payout notifications
    for (const group of groups) {
      try {
        const schedule = await getPayoutSchedule(group.id);
        const user     = await getCurrentUser();
        for (const row of schedule || []) {
          if (row.status === 'paid' && row.user_id === user?.id) {
            notifs.push({
              type: 'payout',
              icon: '🎉',
              color: '#9673a6',
              bg: '#e1d5e7',
              title: 'Payout disbursed to you!',
              message: `${formatCurrency(row.amount)} has been disbursed to you from ${group.name}.`,
              date: row.scheduled_date,
            });
          }
          if (row.status === 'pending' && row.user_id === user?.id && row.scheduled_date) {
            const due = new Date(row.scheduled_date);
            const today = new Date(); today.setHours(0,0,0,0);
            const diff  = Math.round((due - today) / (1000*60*60*24));
            if (diff >= 0 && diff <= 14) {
              notifs.push({
                type: 'payout',
                icon: '📆',
                color: '#9673a6',
                bg: '#e1d5e7',
                title: 'Your payout is coming up',
                message: `Your payout of ${formatCurrency(row.amount)} from ${group.name} is scheduled in ${diff} day${diff === 1 ? '' : 's'}.`,
                date: row.scheduled_date,
              });
            }
          }
        }
      } catch {}
    }

    // 4. Group notifications
    for (const group of groups) {
      notifs.push({
        type: 'group',
        icon: '👥',
        color: '#888888',
        bg: '#f0f0f0',
        title: 'Group membership',
        message: `You are a member of "${group.name}" contributing ${formatCurrency(group.contribution_amount)} ${group.frequency}.`,
        date: group.created_at,
      });
    }

    // Sort by date newest first
    notifs.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    _allNotifs = notifs;

    renderNotifs(notifs);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--slate-400);text-align:center;padding:2rem;">Could not load notifications: ${err.message}</p>`;
  }
}

function renderNotifs(notifs) {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  if (!notifs.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--slate-400);">
        <div style="font-size:3rem;margin-bottom:1rem;">🔔</div>
        <p style="font-size:1rem;font-weight:500;">No notifications yet</p>
        <p style="font-size:.85rem;">Activity from your groups will appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = notifs.map((n,i) => `
    <article style="display:flex;align-items:flex-start;gap:1rem;padding:1rem 1.25rem;background:${n.bg};border:1px solid ${n.color}33;border-radius:10px;margin-bottom:.75rem;" data-type="${n.type}">
      <span style="font-size:1.5rem;line-height:1;flex-shrink:0;">${n.icon}</span>
      <div style="flex:1;">
        <strong style="display:block;font-size:.9rem;color:${n.color};margin-bottom:.2rem;">${escHtml(n.title)}</strong>
        <p style="margin:0;font-size:.85rem;color:#444;">${escHtml(n.message)}</p>
        <small style="color:#888;font-size:.75rem;">${n.date ? formatDate(n.date) : ''}</small>
      </div>
    </article>
  `).join('');
}

window.filterNotifs = function(type) {
  // Update button styles
  ['all','payment','meeting','payout','group'].forEach(t => {
    const btn = document.getElementById('filter-' + t);
    if (btn) btn.className = t === type ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  });

  const filtered = type === 'all' ? _allNotifs : _allNotifs.filter(n => n.type === type);
  renderNotifs(filtered);
};



function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
