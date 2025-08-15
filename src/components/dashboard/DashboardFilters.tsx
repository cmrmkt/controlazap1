
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter } from 'lucide-react'

interface DashboardFiltersProps {
  filterMonth: string
  filterYear: string
  setFilterMonth: (month: string) => void
  setFilterYear: (year: string) => void
  transactionCount: number
}

export function DashboardFilters({ 
  filterMonth, 
  filterYear, 
  setFilterMonth, 
  setFilterYear, 
  transactionCount 
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <img 
          src="/lovable-uploads/a1905fc1-9bc7-4e86-9542-961da6ddf409.png" 
          alt="ControlaZap Logo" 
          className="h-8 sm:h-10 w-auto object-contain"
        />
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Sistema de Gestão Financeira</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visão geral das suas finanças pessoais
            {transactionCount > 0 && ` • ${transactionCount} transações encontradas`}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 items-center">
        <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-28 sm:w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-20 sm:w-24 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
