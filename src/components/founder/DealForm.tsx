'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createDeal, updateDeal } from '@/app/actions/dealPipeline'
import type { Database } from '@/lib/database.types'

type DealPipeline = Database['public']['Tables']['deal_pipeline']['Row']
type DealStatus = Database['public']['Tables']['deal_pipeline']['Row']['status']

interface DealFormProps {
  projectId: string
  deal?: DealPipeline
  onSuccess: (deal: DealPipeline) => void
  onCancel: () => void
}

export function DealForm({ projectId, deal, onSuccess, onCancel }: DealFormProps) {
  const [buyerName, setBuyerName] = useState(deal?.target_buyer_name || '')
  const [status, setStatus] = useState<DealStatus>(deal?.status || 'introduced')
  const [feedbackNotes, setFeedbackNotes] = useState(deal?.feedback_notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (deal) {
        // Update existing deal
        const result = await updateDeal(deal.id, {
          target_buyer_name: buyerName,
          status,
          feedback_notes: feedbackNotes || null,
        })
        if (result.success && result.data) {
          onSuccess(result.data)
        } else {
          setError(result.error || 'Failed to update deal')
        }
      } else {
        // Create new deal
        const result = await createDeal({
          project_id: projectId,
          target_buyer_name: buyerName,
          status,
          feedback_notes: feedbackNotes || null,
        })
        if (result.success && result.data) {
          onSuccess(result.data)
        } else {
          setError(result.error || 'Failed to create deal')
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
        <CardTitle>{deal ? 'Edit Deal' : 'Add New Deal'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="buyerName">Buyer/Platform Name</Label>
            <input
              id="buyerName"
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="e.g., Netflix India, SonyLIV"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as DealStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="introduced">Introduced</SelectItem>
                <SelectItem value="in_discussion">In Discussion</SelectItem>
                <SelectItem value="deal_closed">Deal Closed</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="feedbackNotes">Feedback Notes</Label>
            <Textarea
              id="feedbackNotes"
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={4}
              className="mt-1"
              placeholder="Add any feedback, notes, or updates from the buyer..."
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
              {loading ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

