// ============================================================
// supabase-client.js
// Central data layer — all Supabase queries live here.
// Import from this file; never call supabase directly in UI code.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const config = window.STOKVEL_CONFIG || {};
const SUPABASE_URL = String(config.supabaseUrl || '').trim();
const SUPABASE_ANON_KEY = String(config.supabaseAnonKey || '').trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Copy config.example.js to config.js and add the public project settings.');
  }
  return supabase;
}

// ============================================================
// AUTH
// ============================================================

export async function signInWithGoogle() {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (supabase) await getSupabase().auth.signOut();
  localStorage.removeItem('stokvel_user');
}

export async function getCurrentUser() {
  try {
    const stored = localStorage.getItem('stokvel_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id) return { id: parsed.id, email: parsed.email };
    }
  } catch (_) {}
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser();
    if (error) throw error;
    return user;
  } catch (err) {
    console.warn('getCurrentUser:', err.message);
    return null;
  }
}

export async function getMyRole() {
  const { data, error } = await getSupabase().rpc('get_my_role');
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      try {
        const role    = await getMyRole();
        const profile = await getProfile(session.user.id);
        callback({ event, session, role, profile });
      } catch (err) {
        callback({ event, session, role: 'member', profile: null });
      }
    } else if (event === 'SIGNED_OUT') {
      callback({ event, session: null, role: null, profile: null });
    }
  });
}

// ============================================================
// PROFILES
// ============================================================

export async function getProfile(userId) {
  const { data, error } = await getSupabase()
    .from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// ============================================================
// GROUPS
// ============================================================

export async function createGroup(groupData) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('No authenticated user found.');

  const cleanData = {
    name:                String(groupData.name || '').trim(),
    description:         String(groupData.description || '').trim(),
    contribution_amount: Number(groupData.contributionAmount) || 0,
    frequency:           String(groupData.frequency || 'monthly').toLowerCase(),
    max_members:         Number(groupData.maxMembers) || 20,
    created_by:          user.id,
  };

  const { data, error } = await getSupabase()
    .from('groups').insert([cleanData]).select().single();
  if (error) throw error;

  await getSupabase().from('group_members').insert({ group_id: data.id, user_id: user.id });
  return data;
}

export async function getMyGroups() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await getSupabase()
    .from('group_members')
    .select('groups(*, group_members(user_id))')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map(row => row.groups).filter(Boolean);
}

// ============================================================
// INVITATIONS
// ============================================================

export async function sendInvitation(groupId, email, role = 'member') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');
  const token = crypto.randomUUID();
  const { data, error } = await getSupabase().from('invitations').insert({
    group_id: groupId, email: email.toLowerCase().trim(),
    invited_by: user.id, status: 'pending', token, role,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getGroupInvitations(groupId) {
  const { data, error } = await getSupabase()
    .from('invitations').select('*').eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptInvitation(token) {
  const { data, error } = await getSupabase().rpc('accept_invitation', { _token: token });
  if (error) throw error;
  return data;
}

// ============================================================
// CONTRIBUTIONS
// ============================================================

/** Member: own contributions */
export async function getMyContributions() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await getSupabase()
    .from('contributions').select('*, groups(name)')
    .eq('user_id', user.id).order('due_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Treasurer/Admin: all contributions across managed groups with member names */
export async function getAllContributions() {
  const myGroups = await getMyGroups();
  if (!myGroups.length) return [];
  const groupIds = myGroups.map(g => g.id);
  const { data, error } = await getSupabase()
    .from('contributions')
    .select('*, groups(name), profiles(full_name, email)')
    .in('group_id', groupIds)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Treasurer/Admin: update contribution status */
export async function updateContributionStatus(id, status) {
  const { data, error } = await getSupabase()
    .from('contributions')
    .update({ status, paid_at: status === 'completed' ? new Date().toISOString() : null })
    .eq('id', id).select();
  if (error) throw error;
  return data;
}

/** Treasurer/Admin: record a new contribution entry */
export async function recordContribution({ groupId, userId, amount, dueDate, status }) {
  const { data, error } = await getSupabase().from('contributions').insert({
    group_id: groupId, user_id: userId,
    amount: Number(amount), due_date: dueDate, status: status || 'pending',
  }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// PAYOUT SCHEDULE
// ============================================================

export async function getPayoutSchedule(groupId) {
  const { data, error } = await getSupabase()
    .from('payout_schedule')
    .select('*, profiles(full_name, email, avatar_url)')
    .eq('group_id', groupId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Replace entire payout schedule for a group */
export async function savePayoutSchedule(groupId, orderedUserIds, contributionAmount, memberCount) {
  await getSupabase().from('payout_schedule').delete().eq('group_id', groupId);
  if (!orderedUserIds.length) return [];

  const today = new Date();
  const rows = orderedUserIds.map((userId, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + i + 1);
    return {
      group_id: groupId, user_id: userId, position: i + 1,
      scheduled_date: d.toISOString().split('T')[0],
      status: 'pending',
      amount: contributionAmount * (memberCount || orderedUserIds.length),
    };
  });

  const { data, error } = await getSupabase().from('payout_schedule').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function markPayoutPaid(payoutId) {
  const { data, error } = await getSupabase()
    .from('payout_schedule')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payoutId).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// MEETINGS
// ============================================================

export async function getMyMeetings() {
  const myGroups = await getMyGroups();
  if (!myGroups.length) return [];
  const groupIds = myGroups.map(g => g.id);
  const { data, error } = await getSupabase()
    .from('meetings')
    .select('*, groups(name), profiles(full_name)')
    .in('group_id', groupIds)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGroupMeetings(groupId) {
  const { data, error } = await getSupabase()
    .from('meetings')
    .select('*, profiles(full_name)')
    .eq('group_id', groupId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMeeting({ groupId, title, scheduledAt, location, agenda }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');
  const { data, error } = await getSupabase().from('meetings').insert({
    group_id: groupId, title: title.trim(),
    scheduled_at: scheduledAt,
    location: location?.trim() || null,
    agenda: agenda?.trim() || null,
    created_by: user.id,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateMeetingMinutes(meetingId, minutes) {
  const { data, error } = await getSupabase()
    .from('meetings')
    .update({ minutes: minutes.trim(), updated_at: new Date().toISOString() })
    .eq('id', meetingId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMeeting(meetingId) {
  const { error } = await getSupabase().from('meetings').delete().eq('id', meetingId);
  if (error) throw error;
}

// ============================================================
// INTEREST RATES — SA Data Integration
// Source: South African Reserve Bank (SARB) — resbank.co.za
// The interest_rates table is seeded with current SARB rates and
// can be refreshed via a Supabase Edge Function on a schedule.
// SARB is the authoritative public source for SA repo and prime rates.
// ============================================================

export async function getLatestInterestRates() {
  const { data, error } = await getSupabase()
    .from('interest_rates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// ANALYTICS
// ============================================================

/** Contribution compliance per member for a group */
export async function getContributionCompliance(groupId) {
  const { data, error } = await getSupabase()
    .from('contributions')
    .select('user_id, status, profiles(full_name)')
    .eq('group_id', groupId);
  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    const uid = row.user_id;
    if (!map[uid]) map[uid] = { name: row.profiles?.full_name || 'Unknown', total: 0, completed: 0, late: 0, missed: 0 };
    map[uid].total++;
    if (row.status === 'completed') map[uid].completed++;
    else if (row.status === 'late')   map[uid].late++;
    else if (row.status === 'missed') map[uid].missed++;
  }

  return Object.values(map).map(m => ({
    ...m,
    compliance_pct: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
  }));
}

/** Total contributions collected per month for a group */
export async function getContributionsByMonth(groupId) {
  const { data, error } = await getSupabase()
    .from('contributions')
    .select('amount, paid_at')
    .eq('group_id', groupId)
    .eq('status', 'completed')
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: true });
  if (error) throw error;

  const monthMap = {};
  for (const row of data ?? []) {
    const month = row.paid_at.slice(0, 7);
    monthMap[month] = (monthMap[month] || 0) + Number(row.amount);
  }
  return Object.entries(monthMap).map(([month, total]) => ({ month, total_amount: total }));
}
