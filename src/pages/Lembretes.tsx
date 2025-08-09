
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Calendar, Clock, RefreshCw, CreditCard, Receipt, PiggyBank, CheckCircle, AlertTriangle, Pin, PinOff, CalendarPlus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { MonthSelectorDialog } from '@/components/reminders/MonthSelectorDialog'

interface Lembrete {
  id: number
  created_at: string
  userid: string | null
  descricao: string | null
  data: string | null
  valor: number | null
  status: string
  is_recurring: boolean
  repeat_months: number
  icon: string
  original_date: string | null
}

export default function Lembretes() {
  const { user } = useAuth()
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Lembrete | null>(null)
  const [editingLembrete, setEditingLembrete] = useState<Lembrete | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [formData, setFormData] = useState({
    descricao: '',
    data: '',
    valor: '',
    is_recurring: false,
    repeat_months: 1,
    icon: 'calendar',
  })
  const isMobile = useIsMobile()

  useEffect(() => {
    if (user) {
      fetchLembretes()
      
      // Usar o sistema de realtime global - evita duplicação
      let lastUpdateTime = 0;
      const handleRemindersUpdate = (event: CustomEvent) => {
        const { eventType, new: newData, old: oldData } = event.detail;
        console.log('[LEMBRETES] Realtime update received:', { eventType, newData, oldData });
        
        // Debounce para evitar atualizações duplicadas
        const now = Date.now();
        if (lastUpdateTime && now - lastUpdateTime < 500) {
          return;
        }
        lastUpdateTime = now;
        
        if (eventType === 'UPDATE' && newData) {
          setLembretes(prev => 
            prev.map(l => l.id === newData.id ? { ...l, ...newData as Lembrete } : l)
          );
        } else if (eventType === 'DELETE' && oldData) {
          setLembretes(prev => prev.filter(l => l.id !== oldData.id));
        } else if (eventType === 'INSERT' && newData) {
          setLembretes(prev => [...prev, newData as Lembrete]);
        }
      };

      window.addEventListener('reminders-updated', handleRemindersUpdate);
      
      return () => {
        window.removeEventListener('reminders-updated', handleRemindersUpdate);
      };
    }
  }, [user])

  const fetchLembretes = async () => {
    try {
      console.log('Fetching lembretes for user:', user?.id)
      
      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('userid', user?.id)
        .order('data', { ascending: true })

      if (error) {
        console.error('Erro ao buscar lembretes:', error)
        throw error
      }
      
      console.log('Lembretes carregados:', data?.length)
      setLembretes(data || [])
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lembretes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      console.log('Saving lembrete for user:', user?.id)
      
      const lembreteData = {
        descricao: formData.descricao,
        data: formData.data,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        userid: user?.id,
        is_recurring: formData.is_recurring,
        repeat_months: formData.repeat_months,
        icon: formData.icon,
        status: 'pending',
      }

      if (editingLembrete) {
        const { error } = await supabase
          .from('lembretes')
          .update(lembreteData)
          .eq('id', editingLembrete.id)

        if (error) throw error
        toast({ title: "Lembrete atualizado com sucesso!" })
      } else {
        const { error } = await supabase
          .from('lembretes')
          .insert([lembreteData])

        if (error) throw error
        toast({ title: "Lembrete adicionado com sucesso!" })
      }

      setDialogOpen(false)
      setEditingLembrete(null)
      setFormData({
        descricao: '',
        data: '',
        valor: '',
        is_recurring: false,
        repeat_months: 1,
        icon: 'calendar',
      })
      fetchLembretes()
    } catch (error: any) {
      console.error('Erro ao salvar lembrete:', error)
      toast({
        title: "Erro ao salvar lembrete",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (lembrete: Lembrete) => {
    setEditingLembrete(lembrete)
    setFormData({
      descricao: lembrete.descricao || '',
      data: lembrete.data || '',
      valor: lembrete.valor?.toString() || '',
      is_recurring: lembrete.is_recurring || false,
      repeat_months: lembrete.repeat_months || 1,
      icon: lembrete.icon || 'calendar',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return

    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: "Lembrete excluído com sucesso!" })
      fetchLembretes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lembrete",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('userid', user?.id)

      if (error) throw error
      toast({ title: "Todos os lembretes foram excluídos com sucesso!" })
      fetchLembretes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lembretes",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const isToday = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    return date.toDateString() === today.toDateString()
  }

  const getDateStatus = (dateString: string, status: string) => {
    if (status === 'paid') {
      return { variant: 'default' as const, label: 'Pago', bgColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    }
    if (isOverdue(dateString)) {
      return { variant: 'destructive' as const, label: 'Vencido' }
    }
    if (isToday(dateString)) {
      return { variant: 'default' as const, label: 'Hoje' }
    }
    const daysDiff = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      return { variant: 'secondary' as const, label: `${daysDiff} dias` }
    }
    return { variant: 'outline' as const, label: formatDate(dateString) }
  }

  const markAsPaid = async (lembrete: Lembrete) => {
    try {
      const newStatus = lembrete.status === 'paid' ? 'pending' : 'paid'
      
      const { error } = await supabase
        .from('lembretes')
        .update({ status: newStatus })
        .eq('id', lembrete.id)

      if (error) throw error

      toast({
        title: newStatus === 'paid' ? "Lembrete marcado como pago" : "Lembrete marcado como pendente",
        description: newStatus === 'paid' 
          ? "O lembrete foi marcado como pago com sucesso"
          : "O lembrete foi marcado como pendente novamente",
      })

      // Atualizar estado local imediatamente
      setLembretes(prev => 
        prev.map(l => l.id === lembrete.id ? { ...l, status: newStatus } : l)
      )
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Filtrar lembretes baseado no status selecionado
  const filteredLembretes = lembretes.filter(lembrete => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'paid') return lembrete.status === 'paid'
    if (statusFilter === 'pending') return lembrete.status === 'pending' || !lembrete.status
    return true
  })

  const toggleFixedReminder = async (lembrete: Lembrete) => {
    try {
      const newIsRecurring = !lembrete.is_recurring;
      
      console.log('Toggling fixed reminder:', { 
        id: lembrete.id, 
        currentStatus: lembrete.is_recurring, 
        newStatus: newIsRecurring 
      });
      
      // Atualizar o lembrete
      const updateData: any = { 
        is_recurring: newIsRecurring,
        repeat_months: newIsRecurring ? (lembrete.repeat_months || 1) : 1
      };
      
      const { data, error } = await supabase
        .from('lembretes')
        .update(updateData)
        .eq('id', lembrete.id)
        .select();

      if (error) {
        console.error('Error updating recurring status:', error);
        throw error;
      }

      console.log('Updated reminder data:', data);

      // Log de sucesso - função de geração automática removida por agora

      toast({
        title: newIsRecurring ? "Conta fixa ativada" : "Conta fixa desativada",
        description: newIsRecurring 
          ? `Este lembrete será repetido automaticamente por ${lembrete.repeat_months || 1} meses` 
          : "Este lembrete não será mais repetido automaticamente",
      });

      // Recarregar dados do servidor para garantir sincronização
      await fetchLembretes();
    } catch (error: any) {
      console.error('Error toggling fixed reminder:', error);
      toast({
        title: "Erro ao fixar lembrete",
        description: "Não foi possível alterar o status de conta fixa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const openMonthSelector = (lembrete: Lembrete) => {
    setSelectedReminder(lembrete);
    setMonthSelectorOpen(true);
  };

  const createMultipleReminders = async (months: number[]) => {
    if (!selectedReminder) return;

    try {
      const currentYear = new Date().getFullYear();
      const baseDate = new Date(selectedReminder.data || new Date());
      const baseDay = baseDate.getDate();

      const remindersToCreate = months.map(month => {
        // Criar data para o mês específico, mantendo o dia
        let reminderDate = new Date(currentYear, month - 1, baseDay);
        
        // Se o dia não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
        if (reminderDate.getMonth() !== month - 1) {
          reminderDate = new Date(currentYear, month, 0); // Último dia do mês anterior
        }

        return {
          descricao: selectedReminder.descricao,
          data: reminderDate.toISOString().split('T')[0],
          valor: selectedReminder.valor,
          userid: user?.id,
          is_recurring: false, // Cada um será individual
          repeat_months: 1,
          icon: selectedReminder.icon,
          status: 'pending',
          original_date: selectedReminder.data,
        };
      });

      const { error } = await supabase
        .from('lembretes')
        .insert(remindersToCreate);

      if (error) throw error;

      toast({
        title: "Lembretes criados com sucesso!",
        description: `${months.length} lembretes foram criados para os meses selecionados`,
      });

      fetchLembretes();
    } catch (error: any) {
      toast({
        title: "Erro ao criar lembretes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateGoogleCalendarLink = (lembrete: Lembrete): string => {
    if (!lembrete.data || !lembrete.descricao) return '#';
    
    const titulo = encodeURIComponent(`Lembrete: ${lembrete.descricao}`);
    const detalhes = lembrete.valor 
      ? encodeURIComponent(`Valor: R$ ${lembrete.valor.toFixed(2)}`)
      : encodeURIComponent('Lembrete agendado via app');
    
    const dataLembrete = new Date(lembrete.data);
    const dataInicio = dataLembrete.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dataFim = new Date(dataLembrete.getTime() + 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataInicio}/${dataFim}&details=${detalhes}&sf=true&output=xml`;
  }

  return (
    <PageWrapper>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Lembretes
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie seus lembretes de pagamentos e compromissos
            </p>
          </div>
          <div className={cn(
            "flex gap-2",
            isMobile && "w-full"
          )}>
            {lembretes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover Todos
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover todos os lembretes</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá remover permanentemente todos os seus lembretes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remover Todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lembrete
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingLembrete ? 'Editar Lembrete' : 'Novo Lembrete'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLembrete 
                      ? 'Faça as alterações necessárias no lembrete.' 
                      : 'Adicione um novo lembrete para não esquecer pagamentos importantes.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Ex: Pagar conta de luz, Aniversário da Maria..."
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data">Data</Label>
                      <Input
                        id="data"
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData({...formData, data: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor (opcional)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_recurring" className="text-sm font-medium">
                          Conta fixa (repetir mensalmente)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ativar para contas que se repetem todos os meses
                        </p>
                      </div>
                      <Switch
                        id="is_recurring"
                        checked={formData.is_recurring}
                        onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked})}
                      />
                    </div>

                    {formData.is_recurring && (
                      <div className="space-y-2">
                        <Label htmlFor="repeat_months">Repetir por quantos meses?</Label>
                        <Select
                          value={formData.repeat_months.toString()}
                          onValueChange={(value) => setFormData({...formData, repeat_months: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 mês</SelectItem>
                            <SelectItem value="3">3 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="12">12 meses</SelectItem>
                            <SelectItem value="24">24 meses</SelectItem>
                            <SelectItem value="999">Indefinidamente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="icon">Ícone do lembrete</Label>
                      <Select
                        value={formData.icon}
                        onValueChange={(value) => setFormData({...formData, icon: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha um ícone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="calendar">📅 Calendário</SelectItem>
                          <SelectItem value="credit-card">💳 Cartão</SelectItem>
                          <SelectItem value="receipt">🧾 Conta</SelectItem>
                          <SelectItem value="piggy-bank">🐷 Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    {editingLembrete ? 'Atualizar' : 'Adicionar'} Lembrete
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <PageSkeleton cardCount={5} />
        ) : lembretes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Nenhum lembrete encontrado</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                Adicionar primeiro lembrete
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filtros de Status */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                Todos ({lembretes.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
              >
                Pendentes ({lembretes.filter(l => l.status === 'pending' || !l.status).length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('paid')}
              >
                Pagos ({lembretes.filter(l => l.status === 'paid').length})
              </Button>
            </div>

            {filteredLembretes.map((lembrete) => {
              const dateStatus = lembrete.data ? getDateStatus(lembrete.data, lembrete.status || 'pending') : null
              const isPaid = lembrete.status === 'paid'
              
              return (
                <Card key={lembrete.id} className={cn(
                  "transition-all duration-300 group hover:scale-[1.02] cursor-pointer",
                  isPaid 
                    ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1" 
                    : lembrete.data && isOverdue(lembrete.data) 
                      ? "border-destructive/30 bg-destructive/5 hover:shadow-lg" 
                      : "hover:shadow-lg hover:-translate-y-1"
                )}>
                  <CardContent className="p-4 sm:p-6">
                    <div className={cn(
                      "flex items-start gap-3",
                      isMobile ? "flex-col" : "flex-row justify-between"
                    )}>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                           <div className={cn(
                             "p-2 rounded-full transition-colors",
                             isPaid 
                               ? "bg-emerald-500/20 group-hover:bg-emerald-500/30" 
                               : "bg-primary/10 group-hover:bg-primary/20"
                           )}>
                             <Calendar className={cn(
                               "h-4 w-4",
                               isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                             )} />
                          </div>
                          <div className="flex-1 space-y-2">
                             <h3 className={cn(
                               "font-semibold text-sm sm:text-base",
                               isPaid && "text-emerald-700 dark:text-emerald-300"
                             )}>
                               {lembrete.descricao}
                             </h3>
                            {dateStatus && (
                              <Badge 
                                variant={dateStatus.variant} 
                                className={cn(
                                  "text-xs",
                                  isPaid && "bg-emerald-100 text-emerald-800 border-emerald-200"
                                )}
                              >
                                {dateStatus.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs sm:text-sm text-muted-foreground space-y-1 ml-11">
                          {lembrete.data && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Data: {formatDate(lembrete.data)}</span>
                            </div>
                          )}
                           {lembrete.valor && (
                             <p className={cn(
                               "font-medium",
                               isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                             )}>
                               Valor: {formatCurrency(lembrete.valor)}
                             </p>
                           )}
                        </div>
                      </div>
                      
                      <div className={cn(
                        "flex gap-2",
                        isMobile && "w-full justify-end"
                      )}>
                        {/* Botão Marcar como Pago */}
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant={isPaid ? "default" : "outline"}
                          onClick={() => markAsPaid(lembrete)}
                          className={cn(
                            "transition-all",
                            isPaid 
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          )}
                          title={isPaid ? "Marcar como pendente" : "Marcar como pago"}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isMobile && <span className="ml-2 text-xs">{isPaid ? "Pago" : "Pagar"}</span>}
                        </Button>
                        
                        {/* Botão Pin para conta fixa */}
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant={lembrete.is_recurring ? "default" : "outline"}
                          onClick={() => toggleFixedReminder(lembrete)}
                          className={cn(
                            "transition-all",
                            lembrete.is_recurring 
                              ? "bg-indigo-500 hover:bg-indigo-600 text-white" 
                              : "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          )}
                          title={lembrete.is_recurring ? "Desativar conta fixa" : "Ativar como conta fixa"}
                        >
                          {lembrete.is_recurring ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                          {isMobile && <span className="ml-2 text-xs">{lembrete.is_recurring ? "Fixa" : "Fixar"}</span>}
                        </Button>

                        {/* Botão seletor de meses */}
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant="outline"
                          onClick={() => openMonthSelector(lembrete)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                          title="Repetir em meses específicos"
                        >
                          <CalendarPlus className="h-4 w-4" />
                          {isMobile && <span className="ml-2 text-xs">Meses</span>}
                        </Button>

                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant="ghost"
                          onClick={() => handleEdit(lembrete)}
                          className="text-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                          {isMobile && <span className="ml-2 text-xs">Editar</span>}
                        </Button>
                        
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant="outline"
                          asChild
                          className="text-cyan-600 border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300"
                        >
                          <a 
                            href={generateGoogleCalendarLink(lembrete)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Adicionar à Google Agenda"
                          >
                            <Calendar className="h-4 w-4" />
                            {isMobile && <span className="ml-2 text-xs">Agenda</span>}
                          </a>
                        </Button>
                        
                        <Button
                          size={isMobile ? "sm" : "sm"}
                          variant="ghost"
                          onClick={() => handleDelete(lembrete.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {isMobile && <span className="ml-2 text-xs">Excluir</span>}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>

      {/* Modal seletor de meses */}
      <MonthSelectorDialog
        open={monthSelectorOpen}
        onOpenChange={setMonthSelectorOpen}
        onCreateReminders={createMultipleReminders}
        reminderDescription={selectedReminder?.descricao || undefined}
      />
    </PageWrapper>
  )
}
