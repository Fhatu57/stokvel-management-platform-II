// ============================================================
// supabase-client.js — Drop this into your frontend/js/ folder
// Replace the placeholder values with your actual Supabase project URL and anon key
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wzclnjbzouqietbordxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Y2xuamJ6b3VxaWV0Ym9yZHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5Mjc4OTEsImV4cCI6MjA5MTUwMzg5MX0.g4OqfuhERKGq0Ttdb-PinPMVnOdvNucTTfJtM_cXZZk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== AUTH ====================

/** Sign in with Google OAuth */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html',
    },
  });
  if (error) throw error;
  return data;
}

/** Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  localStorage.removeItem('stokvel_user');
}

/** Get current session user */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Get current user's role */
export async function getMyRole() {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) throw error;
  return data; // 'admin' | 'treasurer' | 'member'
}

/** Listen for auth state changes and redirect by role */
export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const role = await getMyRole();
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
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ==================== GROUPS ====================

/** Create a new stokvel group (admin only) */
export async function createGroup({ name, description, contributionAmount, frequency, maxMembers }) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      contribution_amount: contributionAmount,
      frequency,
      max_members: maxMembers,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  // Auto-add creator as group member
  await supabase.from('group_members').insert({
    group_id: data.id,
    user_id: user.id,
  });

  return data;
}

/** Get all groups the current user belongs to */
export async function getMyGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members!inner(user_id)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== INVITATIONS ====================

/** Send an invitation (admin only) */
export async function sendInvitation(groupId, email) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      group_id: groupId,
      email,
      invited_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get invitations for a group */
export async function getGroupInvitations(groupId) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Accept an invitation using token */
export async function acceptInvitation(token) {
  const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
  if (error) throw error;
  return data;
}

// ==================== CONTRIBUTIONS ====================

/** Get my contribution history */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch contributions with group name
export async function getMyContributions() {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount,
      status,
      due_date,
      groups (
        name
      )
    `)
    .order('due_date', { ascending: false });

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}
