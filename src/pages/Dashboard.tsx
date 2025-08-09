import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { RemindersProvider, useReminders } from '@/contexts/RemindersContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { GoalsControlPanel } from '@/components/dashboard/GoalsControlPanel'
import { SmartReminders } from '@/components/dashboard/SmartReminders'
import { PriorityReminders } from '@/components/dashboard/PriorityReminders'
import { FixedReminders } from '@/components/dashboard/FixedReminders'

interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  userid: string | null
  categorias?: {
    id: string
    nome: string
  }
}

interface Lembrete {
  id: number
  created_at?: string
  userid: string | null
  descricao: string | null
  data: string | null
  valor: number | null
  status: string
  is_recurring?: boolean
  repeat_months?: number
  icon?: string
  original_date?: string | null
}

function DashboardContent() {
  const { user } = useAuth()
  const { reminders } = useReminders()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Configure real-time synchronization
  useRealtimeSync()
  
  // Estados dos filtros
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Auto-refresh data periodically as fallback for N8N sync
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      console.log('[DASHBOARD] Auto-refreshing data for N8N sync fallback...');
      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user])

  // Listen for real-time updates from N8N WhatsApp integration
  useEffect(() => {
    const handleDataUpdate = (event: any) => {
      console.log('[DASHBOARD] Data updated via realtime:', event.type);
      setRefreshKey(prev => prev + 1);
      fetchData(); // Refresh data
      
      // Show toast notification for new data from WhatsApp
      if (event.type === 'transactions-updated' && event.detail?.eventType === 'INSERT') {
        toast({
          title: "💰 Nova transação via WhatsApp",
          description: "Sua transação foi registrada automaticamente",
        });
      }
      
      if (event.type === 'reminders-updated' && event.detail?.eventType === 'INSERT') {
        toast({
          title: "⏰ Novo lembrete via WhatsApp",
          description: "Um lembrete foi criado automaticamente",
        });
      }

      if (event.type === 'profile-updated') {
        toast({
          title: "✅ Perfil atualizado",
          description: "Seus dados foram sincronizados via WhatsApp",
        });
      }

      if (event.type === 'goals-updated') {
        toast({
          title: "🎯 Metas atualizadas",
          description: "Suas metas financeiras foram ajustadas",
        });
      }

      if (event.type === 'subscription-updated') {
        toast({
          title: "📱 Assinatura sincronizada",
          description: "Status atualizado do sistema de pagamento",
        });
      }

      if (event.type === 'categories-updated') {
        toast({
          title: "📂 Categorias atualizadas",
          description: "Nova categoria criada ou modificada",
        });
      }
    };

    window.addEventListener('profile-updated', handleDataUpdate);
    window.addEventListener('transactions-updated', handleDataUpdate);
    window.addEventListener('reminders-updated', handleDataUpdate);
    window.addEventListener('goals-updated', handleDataUpdate);
    window.addEventListener('subscription-updated', handleDataUpdate);
    window.addEventListener('categories-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleDataUpdate);
      window.removeEventListener('transactions-updated', handleDataUpdate);
      window.removeEventListener('reminders-updated', handleDataUpdate);
      window.removeEventListener('goals-updated', handleDataUpdate);
      window.removeEventListener('subscription-updated', handleDataUpdate);
      window.removeEventListener('categories-updated', handleDataUpdate);
    };
  }, [])

  useEffect(() => {
    if (!user) return;

    // Enhanced realtime configuration for all user data
    const channel = supabase
      .channel('dashboard-comprehensive')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transacoes', filter: `userid=eq.${user.id}` },
        (payload) => {
          console.log('[REALTIME] Transaction update:', payload);
          window.dispatchEvent(new CustomEvent('transactions-updated', { detail: payload }));
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lembretes', filter: `userid=eq.${user.id}` },
        (payload) => {
          console.log('[REALTIME] Reminder update:', payload);
          window.dispatchEvent(new CustomEvent('reminders-updated', { detail: payload }));
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'categorias', filter: `userid=eq.${user.id}` },
        (payload) => {
          console.log('[REALTIME] Category update:', payload);
          window.dispatchEvent(new CustomEvent('categories-updated', { detail: payload }));
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_goals', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[REALTIME] Goals update:', payload);
          window.dispatchEvent(new CustomEvent('goals-updated', { detail: payload }));
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          console.log('[REALTIME] Profile update:', payload);
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: payload }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user])

  // Auto-refresh for N8N sync fallback (reduced frequency with smart logic)
  useEffect(() => {
    if (!user) return;

    let lastUpdateTime = Date.now();
    const trackUpdate = () => { lastUpdateTime = Date.now(); };

    // Track realtime updates to reduce unnecessary refreshes
    window.addEventListener('transactions-updated', trackUpdate);
    window.addEventListener('reminders-updated', trackUpdate);
    window.addEventListener('categories-updated', trackUpdate);

    const autoRefreshInterval = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdateTime;
      const shouldRefresh = timeSinceUpdate > 30000; // Only if no updates in 30s

      if (shouldRefresh) {
        console.log('[DASHBOARD] Auto-refreshing data for N8N sync fallback...');
        fetchData();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(autoRefreshInterval);
      window.removeEventListener('transactions-updated', trackUpdate);
      window.removeEventListener('reminders-updated', trackUpdate);
      window.removeEventListener('categories-updated', trackUpdate);
    };
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching data for user:', user?.id)
      
      // Buscar transações
      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          )
        `)
        .eq('userid', user?.id)
        .order('created_at', { ascending: false })

      if (transacoesError) {
        console.error('Erro ao buscar transações:', transacoesError)
        throw transacoesError
      }

      console.log('Dados carregados:', { 
        transacoes: transacoesData?.length
      })

      setTransacoes(transacoesData || [])
    } catch (error: any) {
      console.error('Erro detalhado:', error)
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar transações por mês e ano com melhor precisão
  const filteredTransacoes = useMemo(() => {
    if (!transacoes?.length) return []
    
    const targetMonth = parseInt(filterMonth)
    const targetYear = parseInt(filterYear)
    
    if (isNaN(targetMonth) || isNaN(targetYear)) return []
    
    return transacoes.filter(transacao => {
      if (!transacao?.quando) return false
      
      try {
        const transacaoDate = new Date(transacao.quando)
        
        // Verificar se a data é válida
        if (isNaN(transacaoDate.getTime())) return false
        
        const transacaoMonth = transacaoDate.getMonth()
        const transacaoYear = transacaoDate.getFullYear()
        
        return transacaoMonth === targetMonth && transacaoYear === targetYear
      } catch (error) {
        console.error('Erro ao processar data da transação:', transacao.id, error)
        return false
      }
    })
  }, [transacoes, filterMonth, filterYear])

  // Calcular estatísticas com precisão otimizada
  const stats = useMemo(() => {
    const targetMonth = parseInt(filterMonth)
    const targetYear = parseInt(filterYear)
    
    if (isNaN(targetMonth) || isNaN(targetYear)) {
      return {
        totalReceitas: 0,
        totalDespesas: 0,
        saldo: 0,
        transacoesCount: 0,
        lembretesPagosCount: 0,
        lembretesPagosValor: 0
      }
    }

    // Cálculos precisos de transações
    const calculations = filteredTransacoes.reduce(
      (acc, transacao) => {
        if (!transacao?.valor) return acc
        
        const valor = Number(transacao.valor)
        
        // Validação mais rigorosa - incluir valores válidos maiores que 0
        if (isNaN(valor) || valor <= 0) return acc
        
        const valorAbsoluto = Math.abs(valor)
        
        if (transacao.tipo === 'receita') {
          acc.totalReceitas += valorAbsoluto
        } else if (transacao.tipo === 'despesa') {
          acc.totalDespesas += valorAbsoluto
        }
        
        return acc
      },
      { totalReceitas: 0, totalDespesas: 0 }
    )
    
    const saldo = calculations.totalReceitas - calculations.totalDespesas
    
    // Calcular lembretes pagos no mês atual usando o contexto
    const lembretesPagos = reminders?.filter(lembrete => {
      if (!lembrete?.data || lembrete.status !== 'paid') return false
      
      try {
        const lembreteDate = new Date(lembrete.data)
        if (isNaN(lembreteDate.getTime())) return false
        
        return lembreteDate.getMonth() === targetMonth && 
               lembreteDate.getFullYear() === targetYear
      } catch {
        return false
      }
    }) || []

    const lembretesPagosValor = lembretesPagos.reduce((acc, lembrete) => {
      const valor = Number(lembrete.valor || 0)
      return acc + (isNaN(valor) ? 0 : Math.abs(valor))
    }, 0)

    return {
      totalReceitas: Number((calculations.totalReceitas || 0).toFixed(2)),
      totalDespesas: Number((calculations.totalDespesas || 0).toFixed(2)),
      saldo: Number((saldo || 0).toFixed(2)),
      transacoesCount: filteredTransacoes.length,
      lembretesPagosCount: lembretesPagos.length,
      lembretesPagosValor: Number(lembretesPagosValor.toFixed(2))
    }
  }, [filteredTransacoes, reminders, filterMonth, filterYear])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <DashboardFilters 
        filterMonth={filterMonth}
        filterYear={filterYear}
        setFilterMonth={setFilterMonth}
        setFilterYear={setFilterYear}
        transactionCount={filteredTransacoes.length}
      />
      
      {/* Bloco de Metas Futurístico */}
      <GoalsControlPanel transacoes={transacoes} />
      
      <DashboardStats stats={stats} />
      
      {/* Lembretes Prioritários */}
      <PriorityReminders />
      
      {/* Contas Fixas */}
      <FixedReminders />
      
      {/* Sistema de Lembretes Inteligentes */}
      <SmartReminders />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts transacoes={filteredTransacoes} />
        </div>
        <div>
          <DashboardSidebar lembretes={reminders} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <RemindersProvider>
      <DashboardContent />
    </RemindersProvider>
  )
}
