import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Filter, Calendar, RotateCcw } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { ReportFilters } from '@/hooks/useReports'
import { useMemo, useCallback } from 'react'

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onClearFilters: () => void
}

export function ReportFiltersComponent({ filters, onFiltersChange, onClearFilters }: ReportFiltersProps) {
  const { categories, isLoading } = useCategories()

  const handlePeriodChange = useCallback((period: 'day' | 'month' | 'year' | 'custom') => {
    const now = new Date()
    let startDate = ''
    let endDate = ''
    let specificMonth = ''

    switch (period) {
      case 'day':
        startDate = now.toISOString().split('T')[0]
        endDate = startDate
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        specificMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      case 'custom':
        // Keep current dates or clear them
        break
    }

    onFiltersChange({
      ...filters,
      period,
      ...(period !== 'custom' && { startDate, endDate }),
      ...(period === 'month' && { specificMonth })
    })
  }, [filters, onFiltersChange])

  const handleSpecificMonthChange = useCallback((monthYear: string) => {
    if (!monthYear) return

    const [year, month] = monthYear.split('-').map(Number)
    
    // Validate date
    if (year < 2020 || year > new Date().getFullYear() + 1) return
    if (month < 1 || month > 12) return

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    onFiltersChange({
      ...filters,
      period: 'custom',
      startDate,
      endDate,
      specificMonth: monthYear
    })
  }, [filters, onFiltersChange])

  // Generate optimized month options (last 24 months + next 12 months)
  const monthOptions = useMemo(() => {
    const options = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Start from 24 months ago
    const startDate = new Date(currentYear, currentMonth - 23, 1)
    // End 12 months in the future
    const endDate = new Date(currentYear, currentMonth + 12, 1)

    let iterDate = new Date(startDate)
    while (iterDate <= endDate) {
      const year = iterDate.getFullYear()
      const month = iterDate.getMonth()
      
      const value = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = iterDate.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      })
      
      options.push({ value, label })
      
      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1)
    }

    return options.reverse() // Most recent first
  }, [])

  // Check if current filters differ from current month defaults
  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    
    return filters.startDate === currentMonthStart &&
           filters.endDate === currentMonthEnd &&
           filters.type === '' &&
           filters.categoryId === '' &&
           filters.period === 'month'
  }, [filters])

  const hasFilters = !isCurrentMonth

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={filters.period} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mês Específico</Label>
            <Select value={filters.specificMonth} onValueChange={handleSpecificMonthChange}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder={
                  (() => {
                    const now = new Date()
                    return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  })()
                } />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filters.period === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select 
              value={filters.type} 
              onValueChange={(value) => onFiltersChange({ ...filters, type: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select 
              value={filters.categoryId} 
              onValueChange={(value) => onFiltersChange({ ...filters, categoryId: value === 'all' ? '' : value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando..." : "Todas categorias"} />
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
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClearFilters} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Voltar ao Mês Atual
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
