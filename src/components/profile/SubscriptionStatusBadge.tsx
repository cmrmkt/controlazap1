
import { Badge } from '@/components/ui/badge'

interface SubscriptionStatusBadgeProps {
  status: string
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-accent text-accent-foreground hover:bg-accent">Ativo</Badge>
    case 'INACTIVE':
      return <Badge variant="secondary">Inativo</Badge>
    case 'CANCELLED':
      return <Badge variant="destructive">Cancelado</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Suspenso</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
