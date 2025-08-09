
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/hooks/useCategories'

interface CategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function CategorySelector({ value, onValueChange, placeholder = "Selecione a categoria" }: CategorySelectorProps) {
  const { categories, isLoading } = useCategories()

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando categorias..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Nenhuma categoria encontrada" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} required>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((categoria) => (
          <SelectItem key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
