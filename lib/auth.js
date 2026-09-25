'use client';

import { supabase } from './supabaseClient';

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(nome, email, password, whatsapp = '') {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, whatsapp },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
