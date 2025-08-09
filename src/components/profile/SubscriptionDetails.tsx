
import { Calendar, DollarSign, Clock, RefreshCw, Tag } from 'lucide-react'
import type { SubscriptionData } from '@/types/subscription'

interface SubscriptionDetailsProps {
  subscriptionData: SubscriptionData
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Não informado'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const formatCurrency = (value: number | null): string => {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const getCycleLabel = (cycle: string | null): string => {
  if (!cycle) return 'Não informado'
  switch (cycle.toLowerCase()) {
    case 'monthly':
      return 'Plano Mensal'
    case 'yearly':
      return 'Plano Anual'
    case 'quarterly':
      return 'Plano Trimestral'
    default:
      return cycle
  }
}

export function SubscriptionDetails({ subscriptionData }: SubscriptionDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        {subscriptionData.plan_name && (
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="font-medium">{subscriptionData.plan_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Data da Assinatura</p>
            <p className="font-medium">{formatDate(subscriptionData.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{subscriptionData.status}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Última Atualização</p>
            <p className="font-medium">{formatDate(subscriptionData.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
