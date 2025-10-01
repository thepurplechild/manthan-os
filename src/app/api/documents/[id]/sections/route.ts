import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id

    // Verify user owns the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', documentId)
      .single()

    if (docError || !document || document.owner_id !== user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch document sections
    const { data: sections, error: sectionsError } = await supabase
      .from('document_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (sectionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch sections' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}