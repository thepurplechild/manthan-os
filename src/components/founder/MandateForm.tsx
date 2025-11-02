'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createPlatformMandate, updatePlatformMandate } from '@/app/actions/platformMandates'
import type { Database } from '@/lib/database.types'

type PlatformMandate = Database['public']['Tables']['platform_mandates']['Row']

interface MandateFormProps {
  mandate?: PlatformMandate
  onSuccess: (mandate: PlatformMandate) => void
  onCancel: () => void
}

export function MandateForm({ mandate, onSuccess, onCancel }: MandateFormProps) {
  const [platformName, setPlatformName] = useState(mandate?.platform_name || '')
  const [mandateDescription, setMandateDescription] = useState(mandate?.mandate_description || '')
  const [tags, setTags] = useState(mandate?.tags.join(', ') || '')
  const [source, setSource] = useState(mandate?.source || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      if (mandate) {
        // Update existing mandate
        const result = await updatePlatformMandate(mandate.id, {
          platform_name: platformName,
          mandate_description: mandateDescription,
          tags: tagsArray,
          source: source || null,
        })
        if (result.success && result.data) {
          onSuccess(result.data)
        } else {
          setError(result.error || 'Failed to update mandate')
        }
      } else {
        // Create new mandate
        const result = await createPlatformMandate({
          platform_name: platformName,
          mandate_description: mandateDescription,
          tags: tagsArray,
          source: source || null,
        })
        if (result.success && result.data) {
          onSuccess(result.data)
        } else {
          setError(result.error || 'Failed to create mandate')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mandate ? 'Edit Platform Mandate' : 'Add New Platform Mandate'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="platformName">Platform Name</Label>
            <input
              id="platformName"
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
              placeholder="e.g., Netflix India, SonyLIV, Zee5"
            />
          </div>

          <div>
            <Label htmlFor="mandateDescription">Mandate Description</Label>
            <Textarea
              id="mandateDescription"
              value={mandateDescription}
              onChange={(e) => setMandateDescription(e.target.value)}
              required
              rows={6}
              className="mt-1"
              placeholder="Describe the platform's current content mandate, requirements, or preferences..."
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
              placeholder="e.g., thriller, female-led, tamil, regional"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          <div>
            <Label htmlFor="source">Source (optional)</Label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
              placeholder="e.g., Conversation with Exec A, Industry Report 2024"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mandate ? 'Update Mandate' : 'Create Mandate'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

