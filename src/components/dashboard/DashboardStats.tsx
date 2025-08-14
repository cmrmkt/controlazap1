
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface DashboardStatsProps {
  stats: {
    totalReceitas: number
    totalDespesas: number
    saldo: number
    transacoesCount: number
    lembretesPagosCount: number
    lembretesPagosValor: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Total de Receitas
          </CardTitle>
          <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {formatCurrency(stats.totalReceitas)}
          </div>
          <p className="text-xs sm:text-sm text-emerald-600/70 dark:text-emerald-400/70 font-medium">
            Mês atual
          </p>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300">
            Total de Despesas
          </CardTitle>
          <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {formatCurrency(stats.totalDespesas)}
          </div>
          <p className="text-xs sm:text-sm text-red-600/70 dark:text-red-400/70 font-medium">
            Mês atual
          </p>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Saldo Atual
          </CardTitle>
          <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(stats.saldo)}
          </div>
          <p className="text-xs sm:text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">
            Receitas - Despesas
          </p>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Lembretes Pagos
          </CardTitle>
          <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {formatCurrency(stats.lembretesPagosValor)}
          </div>
          <p className="text-xs sm:text-sm text-emerald-600/70 dark:text-emerald-400/70 font-medium">
            {stats.lembretesPagosCount} lembretes pagos este mês
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
