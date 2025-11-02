'use server'

import { requireFounder } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type PlatformMandate = Database['public']['Tables']['platform_mandates']['Row']
type PlatformMandateInsert = Database['public']['Tables']['platform_mandates']['Insert']
type PlatformMandateUpdate = Database['public']['Tables']['platform_mandates']['Update']

/**
 * Get all platform mandates (founder-only)
 */
export async function getPlatformMandates(): Promise<PlatformMandate[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch platform mandates: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single platform mandate by ID
 */
export async function getPlatformMandateById(id: string): Promise<PlatformMandate | null> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Create a new platform mandate
 */
export async function createPlatformMandate(
  mandate: Omit<PlatformMandateInsert, 'created_by'>
): Promise<{ success: boolean; data?: PlatformMandate; error?: string }> {
  const { user } = await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .insert({
      ...mandate,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as PlatformMandate }
}

/**
 * Update an existing platform mandate
 */
export async function updatePlatformMandate(
  id: string,
  updates: PlatformMandateUpdate
): Promise<{ success: boolean; data?: PlatformMandate; error?: string }> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as PlatformMandate }
}

/**
 * Delete a platform mandate
 */
export async function deletePlatformMandate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('platform_mandates')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Search platform mandates by platform name or tags
 */
export async function searchPlatformMandates(
  query: string
): Promise<PlatformMandate[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .select('*')
    .or(`platform_name.ilike.%${query}%,mandate_description.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to search platform mandates: ${error.message}`)
  }

  return data || []
}

/**
 * Get platform mandates by platform name
 */
export async function getPlatformMandatesByPlatform(
  platformName: string
): Promise<PlatformMandate[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .select('*')
    .eq('platform_name', platformName)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch platform mandates: ${error.message}`)
  }

  return data || []
}

/**
 * Get platform mandates by tag
 */
export async function getPlatformMandatesByTag(
  tag: string
): Promise<PlatformMandate[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_mandates')
    .select('*')
    .contains('tags', [tag])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch platform mandates by tag: ${error.message}`)
  }

  return data || []
}

