import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('=== Search API Debug ===')
    console.log('User authenticated:', !!user)
    console.log('User ID:', user?.id)
    console.log('User email:', user?.email)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, limit = 5, threshold = 0.7 } = await request.json()

    console.log('Search parameters:', { query, limit, threshold })

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate query embedding via Voyage AI
    console.log('Calling Voyage AI...')
    const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
      },
      body: JSON.stringify({
        input: [query],
        model: 'voyage-3-lite'
      })
    })

    if (!voyageResponse.ok) {
      const error = await voyageResponse.text()
      console.error('Voyage AI error:', error)
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
    }

    const voyageData = await voyageResponse.json()
    const queryEmbedding = voyageData.data[0].embedding

    console.log('Embedding generated, dimensions:', queryEmbedding?.length)

    // Perform vector similarity search
    console.log('Calling search_documents with:', {
      embedding_dims: queryEmbedding?.length,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: user.id
    })

    const { data: results, error } = await supabase.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: user.id
    })

    console.log('Search results:', {
      success: !error,
      count: results?.length || 0,
      error: error?.message
    })

    if (error) {
      console.error('Search error details:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('=== End Search Debug ===')

    return NextResponse.json({
      results: results || [],
      query,
      count: results?.length || 0
    })

  } catch (error) {
    console.error('Search endpoint error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}