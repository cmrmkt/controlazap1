import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addMonths } from 'date-fns';

interface Reminder {
  id: number;
  descricao: string | null;
  data: string | null;
  valor: number | null;
  status: string;
  is_recurring: boolean;
  repeat_months: number;
  icon: string;
  original_date: string | null;
  userid: string;
}

interface RemindersContextType {
  reminders: Reminder[];
  loading: boolean;
  markAsPaid: (id: number) => Promise<void>;
  deleteReminder: (id: number) => Promise<void>;
  updateReminderStatus: (id: number, status: string) => Promise<void>;
  refreshReminders: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshReminders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('userid', user.id)
        .order('data', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const createNextRecurringReminder = async (reminder: Reminder) => {
    if (!user || !reminder.is_recurring) return;

    const currentDate = new Date(reminder.data!);
    const nextDate = addMonths(currentDate, 1);
    
    // Verificar se não existe próximo lembrete
    const { data: existingNext } = await supabase
      .from('lembretes')
      .select('id')
      .eq('userid', user.id)
      .eq('descricao', reminder.descricao)
      .eq('data', nextDate.toISOString().split('T')[0])
      .maybeSingle();

    if (!existingNext) {
      const { error: createError } = await supabase
        .from('lembretes')
        .insert({
          userid: user.id,
          descricao: reminder.descricao,
          data: nextDate.toISOString().split('T')[0],
          valor: reminder.valor,
          status: 'pending',
          is_recurring: false,
          repeat_months: 1,
          icon: reminder.icon,
          original_date: reminder.data
        });

      if (createError) {
        console.error('Error creating next reminder:', createError);
      } else {
        console.log('Next recurring reminder created successfully');
      }
    }
  };

  const markAsPaid = async (id: number) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return;

      // Atualizar status no banco
      const { error } = await supabase
        .from('lembretes')
        .update({ status: 'paid' })
        .eq('id', id);

      if (error) throw error;

      // Criar próximo lembrete se for recorrente
      await createNextRecurringReminder(reminder);

      // Atualizar estado local
      setReminders(prev => 
        prev.map(r => r.id === id ? { ...r, status: 'paid' } : r)
      );

      toast({
        title: "Lembrete marcado como pago",
        description: reminder.is_recurring ? "Próximo lembrete criado automaticamente" : undefined,
      });

      console.log(`Reminder ${id} marked as paid, broadcasting update`);

    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como pago",
        variant: "destructive"
      });
    }
  };

  const updateReminderStatus = async (id: number, status: string) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return;

      // Atualizar status no banco
      const { error } = await supabase
        .from('lembretes')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Criar próximo lembrete se marcado como pago e for recorrente
      if (status === 'paid') {
        await createNextRecurringReminder(reminder);
      }

      // Atualizar estado local
      setReminders(prev => 
        prev.map(r => r.id === id ? { ...r, status } : r)
      );

      toast({
        title: "Status atualizado",
        description: `Lembrete marcado como ${status === 'paid' ? 'pago' : status}`,
      });

      console.log(`Reminder ${id} status updated to ${status}`);

    } catch (error) {
      console.error('Error updating reminder status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
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

      setReminders(prev => prev.filter(r => r.id !== id));

      toast({
        title: "Lembrete excluído",
        description: "O lembrete foi removido com sucesso",
      });

      console.log(`Reminder ${id} deleted`);

    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lembrete",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    refreshReminders().finally(() => setLoading(false));
    
    // Configurar realtime global para lembretes
    const channel = supabase
      .channel('global-reminders-sync')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lembretes', filter: `userid=eq.${user.id}` },
        (payload) => {
          console.log('Global reminders realtime update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            setReminders(prev => 
              prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new as Reminder } : r)
            );
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setReminders(prev => [...prev, payload.new as Reminder]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setReminders(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up global reminders realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <RemindersContext.Provider value={{
      reminders,
      loading,
      markAsPaid,
      deleteReminder,
      updateReminderStatus,
      refreshReminders
    }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}