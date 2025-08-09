
import { Badge } from '@/components/ui/badge'

interface SubscriptionStatusBadgeProps {
  status: string
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
    case 'INACTIVE':
      return <Badge variant="secondary">Inativo</Badge>
    case 'CANCELLED':
      return <Badge variant="destructive">Cancelado</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Suspenso</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
