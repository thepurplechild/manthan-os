'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, FileText, Search, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MandateForm } from './MandateForm'
import { deletePlatformMandate } from '@/app/actions/platformMandates'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/database.types'

type PlatformMandate = Database['public']['Tables']['platform_mandates']['Row']

interface MandatesListProps {
  initialMandates: PlatformMandate[]
}

export function MandatesList({ initialMandates }: MandatesListProps) {
  const [mandates, setMandates] = useState<PlatformMandate[]>(initialMandates)
  const [showForm, setShowForm] = useState(false)
  const [editingMandate, setEditingMandate] = useState<PlatformMandate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleMandateCreated = (newMandate: PlatformMandate) => {
    setMandates([newMandate, ...mandates])
    setShowForm(false)
    router.refresh()
  }

  const handleMandateUpdated = (updatedMandate: PlatformMandate) => {
    setMandates(mandates.map(m => m.id === updatedMandate.id ? updatedMandate : m))
    setEditingMandate(null)
    router.refresh()
  }

  const handleDelete = async (mandateId: string) => {
    if (confirm('Are you sure you want to delete this platform mandate?')) {
      const result = await deletePlatformMandate(mandateId)
      if (result.success) {
        setMandates(mandates.filter(m => m.id !== mandateId))
        router.refresh()
      } else {
        alert(result.error || 'Failed to delete mandate')
      }
    }
  }

  const filteredMandates = mandates.filter(mandate => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      mandate.platform_name.toLowerCase().includes(query) ||
      mandate.mandate_description.toLowerCase().includes(query) ||
      mandate.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by platform, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Mandate
        </Button>
      </div>

      {/* Form Modals */}
      {showForm && (
        <MandateForm
          onSuccess={handleMandateCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingMandate && (
        <MandateForm
          mandate={editingMandate}
          onSuccess={handleMandateUpdated}
          onCancel={() => setEditingMandate(null)}
        />
      )}

      {/* Mandates Grid */}
      {filteredMandates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No mandates match your search' : 'No platform mandates yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Mandate
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMandates.map((mandate) => (
            <Card key={mandate.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{mandate.platform_name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMandate(mandate)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mandate.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {mandate.source && `Source: ${mandate.source}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4 line-clamp-4">
                  {mandate.mandate_description}
                </p>
                {mandate.tags && mandate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mandate.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  Added {new Date(mandate.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

