import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, limit = 5, threshold = 0.7 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate query embedding via Voyage AI
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

    // Perform vector similarity search
    const { data: results, error } = await supabase.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: user.id
    })

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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