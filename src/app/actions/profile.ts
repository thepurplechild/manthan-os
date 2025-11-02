'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/database.types'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

/**
 * Get the current user's profile with role information
 * @returns Profile object or null if not authenticated
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile as Profile
}

/**
 * Get the current user's role
 * @returns User role ('creator' | 'founder') or null if not authenticated
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getProfile()
  return profile?.role ?? null
}

/**
 * Check if the current user is a founder
 * @returns true if user is a founder, false otherwise
 */
export async function isFounder(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'founder'
}

/**
 * Check if the current user is a creator
 * @returns true if user is a creator, false otherwise
 */
export async function isCreator(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'creator'
}

/**
 * Require authentication - throws error if not authenticated
 * @throws Error if user is not authenticated
 */
export async function requireAuth(): Promise<{ user: { id: string }, profile: Profile }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  const profile = await getProfile()
  
  if (!profile) {
    redirect('/login')
  }

  return { user: { id: user.id }, profile }
}

/**
 * Require founder role - throws error if not founder
 * @throws Error if user is not a founder
 */
export async function requireFounder(): Promise<{ user: { id: string }, profile: Profile }> {
  const { user, profile } = await requireAuth()
  
  if (profile.role !== 'founder') {
    redirect('/dashboard')
  }

  return { user, profile }
}

/**
 * Update user profile
 * @param updates Partial profile updates
 */
export async function updateProfile(updates: { full_name?: string }): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get profile by user ID (for founders viewing creator profiles)
 * @param userId User ID to fetch profile for
 * @returns Profile object or null if not found
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { profile } = await requireFounder()
  
  if (!profile) {
    return null
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Profile
}

