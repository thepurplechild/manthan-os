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
 * Get the current user's profile
 * @returns Profile object or null if not found
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return profile as Profile
}

/**
 * Get the current user's role
 * @returns User role ('creator' or 'founder') or null if not found
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getProfile()
  return profile?.role ?? null
}

/**
 * Check if the current user is a founder
 * @returns true if user is founder, false otherwise
 */
export async function isFounder(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'founder'
}

/**
 * Check if the current user is authenticated
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user !== null
}

/**
 * Get profile by user ID (for admin/founder use)
 * @param userId - The user ID to fetch profile for
 * @returns Profile object or null if not found
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient()

  // Verify current user is founder before allowing this operation
  const currentUserRole = await getUserRole()
  if (currentUserRole !== 'founder') {
    throw new Error('Unauthorized: Only founders can view other profiles')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile by ID:', error)
    return null
  }

  return profile as Profile
}

/**
 * Update the current user's profile
 * @param updates - Partial profile update object
 */
export async function updateProfile(updates: {
  full_name?: string | null
}): Promise<{ success: boolean; error?: string }> {
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
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<void> {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect('/login')
  }
}

/**
 * Require founder role - throws error if not founder
 * @throws Error if user is not a founder
 */
export async function requireFounder(): Promise<void> {
  const founder = await isFounder()
  if (!founder) {
    throw new Error('Unauthorized: This action requires founder role')
  }
}

