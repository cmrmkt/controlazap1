import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReminders } from "@/contexts/RemindersContext";
import { formatCurrency } from "@/utils/currency";
import { format, isToday, isTomorrow, isYesterday, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Calendar,
  CreditCard,
  Receipt,
  PiggyBank
} from "lucide-react";

export function PriorityReminders() {
  const { reminders, loading, updateReminderStatus, deleteReminder } = useReminders();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Filtrar lembretes prioritários (hoje, amanhã, ou vencidos) com status pending
  const priorityReminders = reminders.filter(lembrete => {
    if (!lembrete.data || lembrete.status !== 'pending') return false;
    const reminderDate = new Date(lembrete.data);
    const today = new Date();
    
    return isToday(reminderDate) || 
           isTomorrow(reminderDate) || 
           isBefore(reminderDate, today);
  });

  const handleUpdateStatus = async (id: number, status: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await updateReminderStatus(id, status);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteReminder = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await deleteReminder(id);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Não precisamos mais de useEffect separado, o contexto gerencia tudo

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'credit-card': return CreditCard;
      case 'receipt': return Receipt;
      case 'piggy-bank': return PiggyBank;
      default: return Calendar;
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    if (isBefore(date, today)) return 'Vencido';
    
    return format(date, 'dd/MM');
  };

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (isToday(date)) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (isTomorrow(date)) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (isBefore(date, today)) return 'bg-red-100 text-red-800 border-red-300';
    
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  
  if (priorityReminders.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200 text-sm sm:text-base">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          Lembretes Prioritários ({priorityReminders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {priorityReminders.slice(0, 5).map((lembrete) => {
          const IconComponent = getIconComponent(lembrete.icon);
          
          return (
            <div 
              key={lembrete.id} 
              className="p-2 sm:p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-orange-200 dark:border-orange-700 hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header com ícone e descrição */}
              <div className="flex items-start gap-2 sm:gap-3 mb-3">
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-orange-100 dark:bg-orange-900/50">
                  <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm leading-tight break-words pr-1">
                    {lembrete.descricao}
                  </h4>
                </div>
              </div>
              
              {/* Badges de data e valor */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                <Badge variant="outline" className={`text-xs whitespace-nowrap ${getDateColor(lembrete.data!)}`}>
                  {getDateLabel(lembrete.data!)}
                </Badge>
                {lembrete.valor && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {formatCurrency(lembrete.valor)}
                  </Badge>
                )}
              </div>
              
              {/* Botões de ação - Mobile first */}
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(lembrete.id, 'paid')}
                  disabled={processingIds.has(lembrete.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 sm:h-8 px-2 sm:px-3 text-xs w-full sm:w-auto"
                  title="Marcar como pago"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Pago
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(lembrete.id, 'pending')}
                    disabled={processingIds.has(lembrete.id)}
                    className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 h-7 sm:h-8 px-2 sm:px-3 text-xs flex-1 sm:flex-none"
                    title="Manter pendente"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteReminder(lembrete.id)}
                    disabled={processingIds.has(lembrete.id)}
                    className="h-7 sm:h-8 px-2 sm:px-3 text-xs flex-1 sm:flex-none"
                    title="Excluir lembrete"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {priorityReminders.length > 5 && (
          <div className="text-center text-sm text-orange-700 dark:text-orange-300 mt-2">
            E mais {priorityReminders.length - 5} lembrete(s)...
          </div>
        )}
      </CardContent>
    </Card>
  );
}