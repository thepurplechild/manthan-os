'use server'

import { createClient } from '@/lib/supabase/server'

export interface ProjectWorld {
  id: string
  project_id: string
  characters: Array<{
    name: string
    role?: string
    arc?: string
    want?: string
    need?: string
    wound?: string
  }>
  locations: Array<{
    name: string
    description?: string
    significance?: string
  }>
  time_period: string | null
  social_context: string | null
  themes: string[]
  central_question: string | null
  theme_statement: string | null
  updated_at: string
}

export async function getProjectWorld(projectId: string): Promise<ProjectWorld | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('project_world')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (data) return data as ProjectWorld

  const { data: created } = await supabase
    .from('project_world')
    .insert({ project_id: projectId })
    .select('*')
    .single()

  return (created as ProjectWorld) || null
}

export async function updateProjectWorld(
  projectId: string,
  updates: Partial<Omit<ProjectWorld, 'id' | 'project_id' | 'updated_at'>>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('project_world')
    .upsert(
      { project_id: projectId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' }
    )

  return { error: error?.message || null }
}
