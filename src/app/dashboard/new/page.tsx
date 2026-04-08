import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WriterConversationExperience } from '@/components/story/WriterConversationExperience'

interface NewStoryPageProps {
  searchParams: Promise<{ projectId?: string }>
}

export default async function NewStoryPage({ searchParams }: NewStoryPageProps) {
  const supabase = await createClient()
  const { projectId } = await searchParams
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <WriterConversationExperience projectId={projectId} />
}
