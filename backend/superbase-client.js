// ============================================================
// supabase-client.js
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://wzclnjbzouqietbordxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Y2xuamJ6b3VxaWV0Ym9yZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Mjc4OTEsImV4cCI6MjA5MTUwMzg5MX0.g4OqfuhERKGq0Ttdb-PinPMVnOdvNucTTfJtM_cXZZk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== AUTH ====================

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
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

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (err) {
    console.warn('getCurrentUser: could not get Supabase session:', err.message);
    return null;
  }
}

export async function getMyRole() {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      try {
        const role    = await getMyRole();
        const profile = await getProfile(session.user.id);
        callback({ event, session, role, profile });
      } catch (err) {
        console.error('onAuthStateChange error:', err.message);
        callback({ event, session, role: 'member', profile: null });
      }
    } else if (event === 'SIGNED_OUT') {
      callback({ event, session: null, role: null, profile: null });
    }
  });
}

// ==================== PROFILES ====================

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ==================== GROUPS ====================

export async function createGroup(groupData) {
  console.log('--- createGroup: starting ---');

  const user = await getCurrentUser();
  if (!user?.id) throw new Error('No authenticated user found. Please log in again.');

  const cleanData = {
    name:                String(groupData.name || 'Unnamed Group').trim(),
    description:         String(groupData.description || '').trim(),
    contribution_amount: Number(groupData.contributionAmount) || 0,
    frequency:           String(groupData.frequency || 'monthly').toLowerCase(),
    max_members:         Number(groupData.maxMembers) || 20,
    created_by:          user.id,
  };

  console.log('createGroup: sending to Supabase:', cleanData);

  const { data, error } = await supabase
    .from('groups')
    .insert([cleanData])
    .select()
    .single();

  if (error) {
    console.error('createGroup: DB error:', error.message);
    throw error;
  }

  // Auto-add creator as a group member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: user.id });

  if (memberError) console.warn('Could not add creator to group_members:', memberError.message);

  console.log('createGroup: success:', data);
  return data;
}

export async function getMyGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  const [{ data: created, error: e1 }, { data: membership, error: e2 }] =
    await Promise.all([
      supabase
        .from('groups')
        .select('*, group_members(user_id)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('group_members')
        .select('group_id, groups(*, group_members(user_id))')
        .eq('user_id', user.id),
    ]);

  if (e1 && e2) { console.error('getMyGroups: both queries failed:', e1.message); throw e1; }
  if (e1) console.warn('getMyGroups: created-groups query failed:', e1.message);
  if (e2) console.warn('getMyGroups: membership query failed:', e2.message);

  const groups = [...(created || [])];
  const createdIds = new Set(groups.map(g => g.id));
  for (const row of (membership || [])) {
    if (row.groups && !createdIds.has(row.groups.id)) groups.push(row.groups);
  }

  groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return groups;
}

// ==================== INVITATIONS ====================

/**
 * Save an invitation to Supabase with a unique token, role and status.
 * The token is used to build the accept link that gets emailed to the invitee.
 */
export async function sendInvitation(groupId, email, role = 'member') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      group_id:   groupId,
      email:      email.toLowerCase().trim(),
      invited_by: user.id,
      status:     'pending',
      token,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data; // data.token is used by invites.js to build the accept link
}

export async function getGroupInvitations(groupId) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Called after login with a pending invite token,
 * or directly from accept-invite.html when already logged in.
 * Requires an `accept_invitation` stored procedure in Supabase.
 */
export async function acceptInvitation(token) {
  const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
  if (error) throw error;
  return data;
}

// ==================== CONTRIBUTIONS ====================

export async function getMyContributions() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('contributions')
    .select('*, groups(name)')
    .eq('user_id', user.id)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function recordContribution({ groupId, userId, amount, dueDate, status }) {
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      group_id: groupId,
      user_id:  userId,
      amount:   Number(amount),
      due_date: dueDate,
      status:   status || 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}