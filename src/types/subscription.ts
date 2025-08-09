
export interface SubscriptionData {
  id: string
  user_id: string
  status: 'active' | 'inactive' | 'cancelled' | 'suspended'
  plan_name?: string | null
  card_brand?: string | null
  card_last_four?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ExternalSubscriptionData {
  id: string
  dataAssinatura: string
  valor: number
  ciclo: string
  status: string
  proimoPagamento: string
  creditCard: {
    creditCardNumber: string
    creditCardBrand: string
    creditCardToken: string
  }
}
