
import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface ReportTransaction {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  categorias?: {
    id: string
    nome: string
  }
}

export interface ReportFilters {
  startDate: string
  endDate: string
  type: string
  categoryId: string
  period: 'day' | 'month' | 'year' | 'custom'
  specificMonth: string
}

// Helper function to get current month default values
const getCurrentMonthDefaults = () => {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const specificMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  return { startDate, endDate, specificMonth }
}

export function useReports() {
  const { user } = useAuth()
  
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const defaults = getCurrentMonthDefaults()
    
    return {
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      type: '',
      categoryId: '',
      period: 'month',
      specificMonth: defaults.specificMonth
    }
  })

  // Reset filters to current month defaults
  const resetFilters = useCallback(() => {
    const defaults = getCurrentMonthDefaults()
    setFilters({
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      type: '',
      categoryId: '',
      period: 'month',
      specificMonth: defaults.specificMonth
    })
  }, [])

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['report-transactions', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return []
      
      try {
        let query = supabase
          .from('transacoes')
          .select(`
            *,
            categorias!transacoes_category_id_fkey (
              id,
              nome
            )
          `)
          .eq('userid', user.id)

        // Apply date filters
        if (filters.startDate) {
          query = query.gte('quando', filters.startDate)
        }
        if (filters.endDate) {
          query = query.lte('quando', filters.endDate)
        }

        // Apply type filter
        if (filters.type) {
          query = query.eq('tipo', filters.type)
        }

        // Apply category filter
        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId)
        }

        const { data, error } = await query.order('quando', { ascending: false })

        if (error) {
          console.error('Erro ao buscar transações para relatório:', error)
          // Return empty array instead of throwing to prevent app crash
          return []
        }

        return (data as ReportTransaction[]) || []
      } catch (err) {
        console.error('Erro inesperado ao buscar transações:', err)
        // Return empty array on any error
        return []
      }
    },
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000,
  })

  // Log error if it exists
  if (error) {
    console.error('Query error in useReports:', error)
  }

  // Calculate summary data
  const summaryData = useMemo(() => {
    const receitas = transactions
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = transactions
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const saldo = receitas - despesas

    // Group by category
    const byCategory = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.categorias?.nome || 'Sem categoria'
      const valor = transaction.valor || 0
      
      if (!acc[categoryName]) {
        acc[categoryName] = { receitas: 0, despesas: 0, total: 0 }
      }
      
      if (transaction.tipo === 'receita') {
        acc[categoryName].receitas += valor
      } else {
        acc[categoryName].despesas += valor
      }
      
      acc[categoryName].total = acc[categoryName].receitas - acc[categoryName].despesas
      
      return acc
    }, {} as Record<string, { receitas: number; despesas: number; total: number }>)

    // Group by type for chart data
    const chartData = [
      { name: 'Receitas', value: receitas, color: '#22c55e' },
      { name: 'Despesas', value: despesas, color: '#ef4444' }
    ]

    return {
      receitas,
      despesas,
      saldo,
      byCategory,
      chartData,
      totalTransactions: transactions.length
    }
  }, [transactions])

  return {
    transactions,
    isLoading,
    filters,
    setFilters,
    resetFilters,
    summaryData
  }
}
