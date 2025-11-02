import { getAllDeals } from '@/app/actions/dealPipeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp } from 'lucide-react'

export default async function DealPipelinePage() {
  const deals = await getAllDeals()

  // Group deals by status
  const dealsByStatus = {
    introduced: deals.filter((d) => d.status === 'introduced'),
    in_discussion: deals.filter((d) => d.status === 'in_discussion'),
    deal_closed: deals.filter((d) => d.status === 'deal_closed'),
    passed: deals.filter((d) => d.status === 'passed'),
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'introduced':
        return 'bg-blue-500'
      case 'in_discussion':
        return 'bg-yellow-500'
      case 'deal_closed':
        return 'bg-green-500'
      case 'passed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track all deals from introduction to closure
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {dealsByStatus.introduced.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Introduced</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {dealsByStatus.in_discussion.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">In Discussion</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {dealsByStatus.deal_closed.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Deal Closed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {dealsByStatus.passed.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Passed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board View */}
      {deals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No deals in pipeline</h2>
            <p className="text-muted-foreground mb-6">
              Start adding projects to the deal pipeline to track your progress
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Deal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Introduced Column */}
          <div>
            <div className="mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Introduced
              </h3>
              <p className="text-sm text-muted-foreground">
                {dealsByStatus.introduced.length} deals
              </p>
            </div>
            <div className="space-y-3">
              {dealsByStatus.introduced.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="font-medium mb-2">{deal.target_buyer_name}</div>
                    {deal.feedback_notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {deal.feedback_notes}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* In Discussion Column */}
          <div>
            <div className="mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                In Discussion
              </h3>
              <p className="text-sm text-muted-foreground">
                {dealsByStatus.in_discussion.length} deals
              </p>
            </div>
            <div className="space-y-3">
              {dealsByStatus.in_discussion.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="font-medium mb-2">{deal.target_buyer_name}</div>
                    {deal.feedback_notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {deal.feedback_notes}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Deal Closed Column */}
          <div>
            <div className="mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Deal Closed
              </h3>
              <p className="text-sm text-muted-foreground">
                {dealsByStatus.deal_closed.length} deals
              </p>
            </div>
            <div className="space-y-3">
              {dealsByStatus.deal_closed.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="font-medium mb-2">{deal.target_buyer_name}</div>
                    {deal.feedback_notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {deal.feedback_notes}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Passed Column */}
          <div>
            <div className="mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                Passed
              </h3>
              <p className="text-sm text-muted-foreground">
                {dealsByStatus.passed.length} deals
              </p>
            </div>
            <div className="space-y-3">
              {dealsByStatus.passed.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow opacity-75">
                  <CardContent className="p-4">
                    <div className="font-medium mb-2">{deal.target_buyer_name}</div>
                    {deal.feedback_notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {deal.feedback_notes}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

