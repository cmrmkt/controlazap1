
import { CreditCard } from 'lucide-react'

interface PaymentMethodProps {
  creditCard: {
    creditCardNumber: string
    creditCardBrand: string
    creditCardToken: string
  }
}

export function PaymentMethod({ creditCard }: PaymentMethodProps) {
  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase()
    if (brandLower.includes('visa')) return '💳'
    if (brandLower.includes('master')) return '💳'
    if (brandLower.includes('american')) return '💳'
    return '💳'
  }

  return (
    <div>
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Método de Pagamento
      </h4>
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getBrandIcon(creditCard.creditCardBrand)}</span>
          <div>
            <p className="font-medium">
              {creditCard.creditCardBrand} •••• {creditCard.creditCardNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              Cartão terminado em {creditCard.creditCardNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
