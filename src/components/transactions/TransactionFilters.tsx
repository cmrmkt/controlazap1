
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Filter, X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'

interface TransactionFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  onClearFilters: () => void
}

export function TransactionFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters
}: TransactionFiltersProps) {
  const { categories, isLoading } = useCategories()
  const hasFilters = searchTerm || typeFilter || categoryFilter

  const handleTypeChange = (value: string) => {
    onTypeFilterChange(value === 'all' ? '' : value)
  }

  const handleCategoryChange = (value: string) => {
    onCategoryFilterChange(value === 'all' ? '' : value)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Pesquisar por estabelecimento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={typeFilter || 'all'} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="receita">Receitas</SelectItem>
          <SelectItem value="despesa">Despesas</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoryFilter || 'all'} onValueChange={handleCategoryChange} disabled={isLoading}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Categoria"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories?.map((categoria) => (
            <SelectItem key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters} size="icon">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
