'use client'

import { useState } from 'react'
import { Search, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface SearchResult {
  id: string
  document_id: string
  content: string
  similarity: number
  document_title: string
  section_type: string
  metadata: Record<string, unknown>
}

interface SemanticSearchProps {
  documentId: string;
}

export function SemanticSearch({ documentId }: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10, threshold: 0.4, documentId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Semantic Search</CardTitle>
          <CardDescription>
            Search within this script using natural language
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., romantic scene in a coffee shop"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Search</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {results.length > 0 ? `${results.length} Results` : 'No Results'}
            </h3>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No matching content found. Try a different query.
              </CardContent>
            </Card>
          ) : (
            results.map((result) => (
              <Card key={result.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/documents/${result.document_id}`}
                        className="hover:underline"
                      >
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {result.document_title}
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1">
                        {result.section_type && (
                          <Badge variant="outline" className="text-xs">
                            {result.section_type}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {(result.similarity * 100).toFixed(0)}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}