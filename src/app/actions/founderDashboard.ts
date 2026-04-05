'use server'

import { requireFounder } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types/projects'
import type { Database } from '@/lib/database.types'

type DealPipeline = Database['public']['Tables']['deal_pipeline']['Row']

export interface FounderDashboardData {
  totalProjects: number
  totalActiveDeals: number
  dealsByStatus: {
    introduced: number
    in_discussion: number
    deal_closed: number
    passed: number
  }
  recentProjects: Array<Project & { owner_name: string | null }>
  recentDeals: DealPipeline[]
  platformMandatesCount: number
  successRate: number | null
}

/**
 * Get aggregated data for founder dashboard
 * Returns comprehensive metrics and overview data
 */
export async function getFounderDashboardData(): Promise<FounderDashboardData> {
  await requireFounder()
  
  const supabase = await createClient()

  // Fetch all projects with owner information
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`)
  }

  // Fetch all deals
  const { data: deals, error: dealsError } = await supabase
    .from('deal_pipeline')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10)

  if (dealsError) {
    throw new Error(`Failed to fetch deals: ${dealsError.message}`)
  }

  // Fetch platform mandates count
  const { count: mandatesCount, error: mandatesError } = await supabase
    .from('platform_mandates')
    .select('*', { count: 'exact', head: true })

  if (mandatesError) {
    throw new Error(`Failed to fetch platform mandates count: ${mandatesError.message}`)
  }

  // Count total projects
  const { count: totalProjectsCount, error: totalProjectsError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  if (totalProjectsError) {
    throw new Error(`Failed to fetch total projects count: ${totalProjectsError.message}`)
  }

  // Count deals by status
  const dealsByStatus = {
    introduced: deals?.filter(d => d.status === 'introduced').length || 0,
    in_discussion: deals?.filter(d => d.status === 'in_discussion').length || 0,
    deal_closed: deals?.filter(d => d.status === 'deal_closed').length || 0,
    passed: deals?.filter(d => d.status === 'passed').length || 0,
  }

  // Calculate success rate (deal_closed / (deal_closed + passed))
  const totalClosedDeals = dealsByStatus.deal_closed + dealsByStatus.passed
  const successRate = totalClosedDeals > 0 
    ? (dealsByStatus.deal_closed / totalClosedDeals) * 100 
    : null

  // Format recent projects with owner name
  const recentProjects = (projects || []).map((project: Project & { owner: { full_name: string | null } | null }) => ({
    ...project,
    owner_name: project.owner?.full_name || null,
  })) as Array<Project & { owner_name: string | null }>

  return {
    totalProjects: totalProjectsCount || 0,
    totalActiveDeals: dealsByStatus.introduced + dealsByStatus.in_discussion,
    dealsByStatus,
    recentProjects,
    recentDeals: (deals || []) as DealPipeline[],
    platformMandatesCount: mandatesCount || 0,
    successRate: successRate !== null ? Math.round(successRate * 100) / 100 : null,
  }
}

/**
 * Get projects count by status
 */
export async function getProjectsByStatus(): Promise<Record<string, number>> {
  await requireFounder()
  
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('status')

  if (error) {
    throw new Error(`Failed to fetch projects by status: ${error.message}`)
  }

  const statusCounts: Record<string, number> = {}
  
  projects?.forEach((project: { status: string }) => {
    statusCounts[project.status] = (statusCounts[project.status] || 0) + 1
  })

  return statusCounts
}

