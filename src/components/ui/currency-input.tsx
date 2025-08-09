
import React, { forwardRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string | number
  onChange?: (value: number) => void
}

const formatCurrencyDisplay = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const parseCurrencyValue = (value: string): number => {
  if (!value) return 0
  
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '')
  if (!numbers) return 0
  
  // Converte centavos para reais
  return parseInt(numbers, 10) / 100
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    // Atualizar display quando o valor externo mudar
    useEffect(() => {
      if (!isFocused) {
        const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0)
        setDisplayValue(formatCurrencyDisplay(numValue))
      }
    }, [value, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Permitir campo vazio
      if (!inputValue) {
        setDisplayValue('')
        onChange?.(0)
        return
      }

      // Formatar o valor conforme o usuário digita
      const numericValue = parseCurrencyValue(inputValue)
      const formatted = formatCurrencyDisplay(numericValue)
      
      setDisplayValue(formatted)
      onChange?.(numericValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Reformat on blur to ensure consistency
      const numValue = parseCurrencyValue(displayValue)
      setDisplayValue(formatCurrencyDisplay(numValue))
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(className)}
        placeholder="R$ 0,00"
        inputMode="numeric"
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
