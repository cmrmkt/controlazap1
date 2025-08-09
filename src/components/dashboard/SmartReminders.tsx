import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X,
  PiggyBank,
  CreditCard,
  Receipt
} from "lucide-react";

interface Lembrete {
  id: number;
  descricao: string | null;
  data: string | null;
  valor: number | null;
  status: string;
  is_recurring: boolean;
  repeat_months: number;
  icon: string;
}

export function SmartReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const loadReminders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('userid', user.id)
        .order('data', { ascending: true });

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReminderStatus = async (id: number, status: string) => {
    try {
      const { error } = await supabase
        .from('lembretes')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setLembretes(prev => 
        prev.map(lembrete => 
          lembrete.id === id ? { ...lembrete, status } : lembrete
        )
      );

      toast({
        title: "Status atualizado",
        description: `Lembrete marcado como ${status === 'paid' ? 'pago' : status === 'pending' ? 'pendente' : 'removido'}`,
      });
    } catch (error) {
      console.error('Error updating reminder status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do lembrete",
        variant: "destructive"
      });
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLembretes(prev => prev.filter(lembrete => lembrete.id !== id));
      toast({
        title: "Lembrete removido",
        description: "O lembrete foi removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o lembrete",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    
    loadReminders();
    
    // Configurar realtime para sincronização automática
    const channel = supabase
      .channel('lembretes-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lembretes', filter: `userid=eq.${user.id}` },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            setLembretes(prev => 
              prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new as Lembrete } : l)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLembretes(prev => prev.filter(l => l.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setLembretes(prev => [...prev, payload.new as Lembrete]);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up SmartReminders realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filtrar lembretes do mês atual
  const currentMonthReminders = lembretes.filter(lembrete => {
    if (!lembrete.data) return false;
    const reminderDate = new Date(lembrete.data);
    return reminderDate.getMonth() + 1 === currentMonth && 
           reminderDate.getFullYear() === currentYear;
  });

  // Separar lembretes fixos e únicos - para fixos considerar apenas mês
  const recurringReminders = lembretes.filter(lembrete => {
    if (!lembrete.is_recurring || !lembrete.data) return false;
    const reminderDate = new Date(lembrete.data);
    // Para lembretes fixos, considerar apenas o mês, independente do ano
    return reminderDate.getMonth() + 1 === currentMonth;
  });
  
  const oneTimeReminders = currentMonthReminders.filter(l => !l.is_recurring);

  // Lembretes vencidos
  const overdueReminders = currentMonthReminders.filter(lembrete => {
    if (!lembrete.data || lembrete.status === 'paid') return false;
    const reminderDate = new Date(lembrete.data);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isAfter(today, reminderDate);
  });

  // Calcular valor total dos lembretes do mês
  const totalMonthValue = currentMonthReminders
    .filter(l => l.status === 'pending')
    .reduce((sum, l) => sum + (l.valor || 0), 0);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'credit-card': return CreditCard;
      case 'receipt': return Receipt;
      case 'piggy-bank': return PiggyBank;
      default: return Calendar;
    }
  };

  const getStatusColor = (status: string, data: string | null) => {
    if (status === 'paid') return 'bg-emerald-500';
    if (status === 'missed') return 'bg-red-500';
    
    if (data) {
      const reminderDate = new Date(data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isAfter(today, reminderDate)) return 'bg-orange-500';
    }
    
    return 'bg-blue-500';
  };

  const getStatusBadge = (status: string, data: string | null) => {
    if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-800">Pago</Badge>;
    if (status === 'missed') return <Badge className="bg-red-100 text-red-800">Perdido</Badge>;
    
    if (data) {
      const reminderDate = new Date(data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isAfter(today, reminderDate)) return <Badge className="bg-orange-100 text-orange-800">Vencido</Badge>;
    }
    
    return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>;
  };

  if (loading) return <div className="animate-pulse bg-muted h-60 rounded-lg" />;

  return (
    <div className="space-y-6">
      {/* Card de Resumo */}
      <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-600/15 to-slate-700/25 border-slate-600/30 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-600/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-slate-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <PiggyBank className="h-5 w-5" />
            Resumo de Lembretes - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{totalMonthValue > 0 ? formatCurrency(totalMonthValue) : 'R$ 0,00'}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Total a Reservar</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{currentMonthReminders.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Total de Lembretes</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{recurringReminders.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Contas Fixas</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{overdueReminders.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">Vencidos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Lembretes Vencidos */}
      {overdueReminders.length > 0 && (
        <Card className="border-red-500/40 bg-gradient-to-br from-red-500/20 to-red-600/30 shadow-lg shadow-red-500/20">
          <CardHeader className="bg-red-600/10">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Lembretes Vencidos ({overdueReminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-red-50/50 dark:bg-red-900/10">
            <div className="space-y-3">
              {overdueReminders.map((lembrete) => {
                const IconComponent = getIconComponent(lembrete.icon);
                return (
                  <div key={lembrete.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-4 w-4 text-red-700 dark:text-red-300" />
                      <div>
                        <div className="font-semibold text-red-900 dark:text-red-100">{lembrete.descricao}</div>
                        <div className="text-sm text-red-700 dark:text-red-300">
                          Venceu em {lembrete.data ? format(new Date(lembrete.data), 'dd/MM/yyyy') : 'Data não definida'}
                        </div>
                      </div>
                      {lembrete.valor && (
                        <Badge variant="outline" className="ml-2 border-red-300 text-red-800 bg-red-100 dark:border-red-600 dark:text-red-200 dark:bg-red-900/40">
                          {formatCurrency(lembrete.valor)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                       <Button
                         size="sm"
                         onClick={() => updateReminderStatus(lembrete.id, 'paid')}
                         className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto transition-transform active:scale-95"
                       >
                         <CheckCircle className="h-3 w-3 mr-1" />
                         Pago
                       </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReminderStatus(lembrete.id, 'pending')}
                        className="border-red-300 text-red-800 hover:bg-red-100 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto transition-transform active:scale-95"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteReminder(lembrete.id)}
                        className="min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto transition-transform active:scale-95"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lembretes Únicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Lembretes Únicos ({oneTimeReminders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {oneTimeReminders.length > 0 ? (
              oneTimeReminders.map((lembrete) => {
                const IconComponent = getIconComponent(lembrete.icon);
                return (
                   <div key={lembrete.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${getStatusColor(lembrete.status, lembrete.data)}`} />
                       <IconComponent className="h-4 w-4 text-muted-foreground" />
                       <div>
                         <div className="font-medium">{lembrete.descricao}</div>
                         <div className="text-sm text-muted-foreground">
                           {lembrete.data ? format(new Date(lembrete.data), 'dd/MM/yyyy') : 'Data não definida'}
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       {lembrete.valor && (
                         <Badge variant="outline">
                           {formatCurrency(lembrete.valor)}
                         </Badge>
                       )}
                       {lembrete.status === 'pending' && (
                         <Button
                           size="sm"
                           onClick={() => updateReminderStatus(lembrete.id, 'paid')}
                           className="bg-emerald-500 hover:bg-emerald-600 text-white h-6 px-2 text-xs"
                         >
                           <CheckCircle className="h-3 w-3 mr-1" />
                           Pagar
                         </Button>
                       )}
                       {getStatusBadge(lembrete.status, lembrete.data)}
                     </div>
                   </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum lembrete único este mês
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}