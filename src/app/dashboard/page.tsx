import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = user.email || ''
  const initial = email.charAt(0).toUpperCase()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, description, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const projectList = projects || []

  const projectData = await Promise.all(
    projectList.map(async (p) => {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', p.id)
        .eq('owner_id', user.id)

      const { data: docs } = await supabase
        .from('documents')
        .select('id, asset_metadata')
        .eq('project_id', p.id)
        .eq('owner_id', user.id)

      const docIds = (docs || []).map((d) => d.id)

      let logline: string | null = null
      if (docIds.length > 0) {
        const { data: outputs } = await supabase
          .from('script_analysis_outputs')
          .select('content')
          .in('document_id', docIds)
          .eq('output_type', 'LOGLINES')
          .eq('status', 'GENERATED')
          .order('created_at', { ascending: false })
          .limit(1)

        if (outputs?.[0]?.content) {
          const c = outputs[0].content as { loglines?: Array<{ text?: string }> } | string
          logline = typeof c === 'string' ? c : c?.loglines?.find((l) => l?.text)?.text || null
        }
      }

      const characterNames: string[] = []
      for (const doc of docs || []) {
        const meta = doc.asset_metadata as Record<string, unknown> | null
        if (meta && Array.isArray(meta.characters)) {
          for (const ch of meta.characters as Array<{ name?: string }>) {
            if (ch.name && !characterNames.includes(ch.name)) {
              characterNames.push(ch.name)
            }
          }
        }
      }

      return {
        ...p,
        documentCount: count || 0,
        logline,
        characterNames,
      }
    })
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-[#161616]">
        <span className="text-[13px] text-[#C8A97E] uppercase tracking-[0.15em] font-medium">
          Manthan OS
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 group"
          >
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[#1A1A1A] text-[#E5E5E5] text-sm font-medium">
              {initial}
            </span>
            <span className="text-xs text-[#555555] group-hover:text-[#E5E5E5] transition-colors hidden sm:inline">
              Sign out
            </span>
          </button>
        </form>
      </header>

      {projectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          <h2 className="text-[2rem] font-extralight text-[#E5E5E5] mb-2">
            Your stories live here.
          </h2>
          <p className="text-sm text-[#555555] mb-8">
            Start by telling Manthan about one.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-block bg-[#C8A97E] text-[#0A0A0A] font-medium text-sm px-6 py-3 rounded-[4px] hover:brightness-110 transition"
          >
            Begin a new story →
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-[#E5E5E5]">Your Stories</h2>
            <Link
              href="/dashboard/new"
              className="inline-block bg-[#C8A97E] text-[#0A0A0A] font-medium text-sm px-4 py-2 rounded-[4px] hover:brightness-110 transition"
            >
              + New Story
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projectData.map((p) => (
              <ProjectCard
                key={p.id}
                id={p.id}
                title={p.title}
                description={p.description}
                logline={p.logline}
                documentCount={p.documentCount}
                characterNames={p.characterNames}
                updatedAt={p.updated_at}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
