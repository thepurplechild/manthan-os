import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WriterConversationExperience } from '@/components/story/WriterConversationExperience'

export default async function NewStoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <WriterConversationExperience />
}
