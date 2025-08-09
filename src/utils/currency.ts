
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return 'R$ 0,00'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue)
}

export const parseCurrency = (value: string): number => {
  if (!value || value === 'R$ 0,00') return 0
  
  // Remove R$, espaços, e pontos (separadores de milhares)
  const cleaned = value.replace(/[R$\s.]/g, '')
  // Substitui vírgula por ponto para conversão decimal
  const normalized = cleaned.replace(',', '.')
  const result = parseFloat(normalized) || 0
  
  return Math.round(result * 100) / 100 // Arredonda para 2 casas decimais
}

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers || numbers === '0') return 'R$ 0,00'
  
  // Converte para centavos
  const cents = parseInt(numbers, 10)
  const reais = cents / 100
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais)
}
