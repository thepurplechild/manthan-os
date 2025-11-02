import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/database.types'

/**
 * Require authentication - redirects to login if not authenticated
 * Use in server components and server actions
 */
export async function requireAuth(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
}

/**
 * Require founder role - redirects to dashboard if not founder
 * Use in server components and layout files
 */
export async function requireFounder(): Promise<void> {
  const supabase = await createClient()
  
  // First check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Then check role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'founder') {
    redirect('/dashboard')
  }
}

/**
 * Check if current user is authenticated
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user !== null
}

/**
 * Check if current user is a founder
 * @returns true if user is founder, false otherwise
 */
export async function isFounder(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return false
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'founder'
}

/**
 * Get current user's role
 * @returns User role ('creator' or 'founder') or null if not authenticated
 */
export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile?.role as UserRole) ?? null
}

/**
 * Check if user has a specific role
 * @param role - The role to check for
 * @returns true if user has the specified role, false otherwise
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const userRole = await getUserRole()
  return userRole === role
}

/**
 * Require a specific role - throws error if user doesn't have the role
 * Use in API routes and server actions
 * @param role - The required role
 * @throws Error if user doesn't have the required role
 */
export async function requireRole(role: UserRole): Promise<void> {
  const userRole = await getUserRole()
  if (userRole !== role) {
    throw new Error(`Unauthorized: This action requires ${role} role`)
  }
}

