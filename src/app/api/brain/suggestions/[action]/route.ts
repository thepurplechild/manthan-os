export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )

    const { suggestionId, note } = await request.json()
    const { action } = await params

    if (action === 'dismiss') {
      await supabase
        .from('project_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', suggestionId)
      return NextResponse.json({ success: true })
    }

    if (action === 'apply') {
      const { data: suggestion } = await supabase
        .from('project_suggestions')
        .select('*, project_id')
        .eq('id', suggestionId)
        .single()

      if (!suggestion) return NextResponse.json(
        { error: 'Suggestion not found' }, { status: 404 }
      )

      // Mark as applied
      await supabase
        .from('project_suggestions')
        .update({ status: 'applied' })
        .eq('id', suggestionId)

      // Add to brain messages as refinement
      await supabase
        .from('project_brain_messages')
        .insert({
          project_id: suggestion.project_id,
          role: 'writer',
          content: note
            ? `Apply suggestion "${suggestion.title}": ${note}`
            : `Apply suggestion: ${suggestion.title}`,
          message_type: 'refinement'
        })

      return NextResponse.json({
        success: true,
        projectId: suggestion.project_id
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Suggestion action error:', error)
    return NextResponse.json(
      { error: error instanceof Error
          ? error.message
          : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
