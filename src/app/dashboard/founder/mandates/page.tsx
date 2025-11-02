import { getPlatformMandates } from '@/app/actions/platformMandates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Target } from 'lucide-react'
import Link from 'next/link'

export default async function PlatformMandatesPage() {
  const mandates = await getPlatformMandates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Mandates</h1>
          <p className="text-muted-foreground mt-1">
            Market intelligence and content mandates from platforms and buyers
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Mandate
        </Button>
      </div>

      {/* Mandates List */}
      {mandates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No mandates yet</h2>
            <p className="text-muted-foreground mb-6">
              Start tracking platform content mandates to better match projects with buyers
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Mandate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mandates.map((mandate) => (
            <Card key={mandate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{mandate.platform_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {mandate.mandate_description}
                </p>
                
                {mandate.tags && mandate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mandate.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {mandate.source && (
                  <div className="text-xs text-muted-foreground mb-4">
                    Source: {mandate.source}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Added {new Date(mandate.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

