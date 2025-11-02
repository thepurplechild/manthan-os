'use server'

import { requireFounder } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type DealPipeline = Database['public']['Tables']['deal_pipeline']['Row']
type DealPipelineInsert = Database['public']['Tables']['deal_pipeline']['Insert']
type DealPipelineUpdate = Database['public']['Tables']['deal_pipeline']['Update']

/**
 * Get all deals in the pipeline (founder-only)
 */
export async function getAllDeals(): Promise<DealPipeline[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch deals: ${error.message}`)
  }

  return data || []
}

/**
 * Get all deals for a specific project
 */
export async function getDealsByProject(projectId: string): Promise<DealPipeline[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch deals for project: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single deal by ID
 */
export async function getDealById(id: string): Promise<DealPipeline | null> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Create a new deal entry
 */
export async function createDeal(
  deal: Omit<DealPipelineInsert, 'created_by'>
): Promise<{ success: boolean; data?: DealPipeline; error?: string }> {
  const { user } = await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .insert({
      ...deal,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as DealPipeline }
}

/**
 * Update deal status and notes
 */
export async function updateDealStatus(
  id: string,
  status: DealPipelineUpdate['status'],
  feedbackNotes?: string | null
): Promise<{ success: boolean; data?: DealPipeline; error?: string }> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const updateData: DealPipelineUpdate = {
    status,
  }
  
  if (feedbackNotes !== undefined) {
    updateData.feedback_notes = feedbackNotes
  }
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as DealPipeline }
}

/**
 * Update an existing deal entry
 */
export async function updateDeal(
  id: string,
  updates: DealPipelineUpdate
): Promise<{ success: boolean; data?: DealPipeline; error?: string }> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as DealPipeline }
}

/**
 * Delete a deal entry
 */
export async function deleteDeal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('deal_pipeline')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get deals by status
 */
export async function getDealsByStatus(
  status: DealPipeline['status']
): Promise<DealPipeline[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch deals by status: ${error.message}`)
  }

  return data || []
}

/**
 * Get deals by buyer name
 */
export async function getDealsByBuyer(
  buyerName: string
): Promise<DealPipeline[]> {
  await requireFounder()
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('deal_pipeline')
    .select('*')
    .eq('target_buyer_name', buyerName)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch deals by buyer: ${error.message}`)
  }

  return data || []
}

