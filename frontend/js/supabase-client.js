// ============================================================
// supabase-client.js
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = 'https://oteaojkihuopijkomsur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZWFvamtpaHVvcGlqa29tc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQ2MjMsImV4cCI6MjA5MTQ4MDYyM30.JOoGoT5P8Pv2XRGVVIC3FQbScgtAJhocz7H13Zwx8Cw';

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

/**
 * Returns the current user from Supabase session OR localStorage.
 * The localStorage fallback covers demo/manual logins where no
 * real OAuth token exists, so auth.uid() would be null.
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  const stored = localStorage.getItem('stokvel_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.id) return { id: parsed.id, email: parsed.email };
    } catch (_) {}
  }
  return null;
}

export async function getMyRole() {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const role    = await getMyRole();
      const profile = await getProfile(session.user.id);
      callback({ event, session, role, profile });
    } else if (event === 'SIGNED_OUT') {
      callback({ event, session: null, role: null, profile: null });
    }
  });
}

// ==================== PROFILES ====================

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// ==================== GROUPS ====================

/**
 * Create a new stokvel group.
 * NOTE: 'frequency' must be lowercase to match the DB CHECK constraint:
 *   ('weekly', 'bi-weekly', 'monthly')
 */
export async function createGroup({ name, description, contributionAmount, frequency, maxMembers, startDate }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to create a group');

  // Optional: Check if user has admin role
  try {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Only admins can create groups');
    }
  } catch (roleErr) {
    // If user_roles table doesn't exist yet, skip this check
    console.warn('Role check skipped:', roleErr.message);
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: description || '',
      contribution_amount: contributionAmount,
      frequency,
      max_members: maxMembers || 20,
      created_by: user.id,
      
      
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-add the creator as a group member with admin role
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ 
      group_id: data.id, 
      user_id: user.id,
      role: 'admin'
    });

  // Don't throw on member insert failure — group was still created
  if (memberError) console.warn('Could not add creator to group_members:', memberError.message);

  return data;
}

/**
 * Fetch all groups this user created or belongs to.
 * Uses two separate queries to avoid the Supabase .or() foreign-table
 * limitation which causes errors when filtering on related tables.
 */
export async function getMyGroups() {
  const user = await getCurrentUser();
  if (!user) {
    console.log('getMyGroups: No user found');
    return [];
  }

  // Validate that user.id looks like a UUID (not "user-001")
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    console.warn('getMyGroups: Invalid user ID format (not a UUID):', user.id);
    return [];
  }

  console.log('getMyGroups: Fetching for user', user.id);

  // Query 1: groups the user created
  const { data: created, error: e1 } = await supabase
    .from('groups')
    .select('*, group_members(user_id)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (e1) {
    console.error('Error fetching created groups:', e1.message);
  }

  // Query 2: groups the user is a member of (but didn't create)
  const { data: membership, error: e2 } = await supabase
    .from('group_members')
    .select('group_id, groups(*, group_members(user_id))')
    .eq('user_id', user.id);

  if (e2) {
    console.error('Error fetching membership groups:', e2.message);
  }

  // If both failed, return empty array instead of throwing
  if (e1 && e2) {
    console.error('Both queries failed');
    return [];
  }

  const groups = [...(created || [])];

  // Merge in member groups, avoiding duplicates
  const createdIds = new Set(groups.map(g => g.id));
  for (const row of (membership || [])) {
    if (row.groups && !createdIds.has(row.groups.id)) {
      groups.push(row.groups);
    }
  }

  // Sort by created_at descending
  groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return groups;
}

// ==================== INVITATIONS ====================

export async function sendInvitation(groupId, email, role = 'member') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');
  const { data, error } = await supabase
    .from('invitations')
    .insert({ 
      group_id: groupId, 
      email, 
      invited_by: user.id,
      role: role
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGroupInvitations(groupId) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function acceptInvitation(token) {
  const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
  if (error) throw error;
  return data;
}

// ==================== CONTRIBUTIONS ====================

export async function getMyContributions() {
  const { data, error } = await supabase
    .from('contributions')
    .select('*, groups(name)')
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function recordContribution({ groupId, userId, amount, dueDate, status }) {
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      group_id: groupId,
      user_id: userId,
      amount,
      due_date: dueDate,
      status: status || 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}