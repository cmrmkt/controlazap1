import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReminders } from "@/contexts/RemindersContext";
import { formatCurrency } from "@/utils/currency";
import { format, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar,
  CreditCard,
  Receipt,
  PiggyBank,
  CheckCircle,
  Clock,
  RotateCcw,
  Trash2
} from "lucide-react";

export function FixedReminders() {
  const { reminders, loading, markAsPaid, deleteReminder } = useReminders();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Filtrar apenas lembretes recorrentes
  const fixedReminders = reminders.filter(r => r.is_recurring);

  const handleMarkAsPaid = async (id: number) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await markAsPaid(id);
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

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'credit-card': return CreditCard;
      case 'receipt': return Receipt;
      case 'piggy-bank': return PiggyBank;
      default: return Calendar;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  // Não precisamos mais de useEffect separado, o contexto gerencia tudo

  if (loading) return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  
  if (fixedReminders.length === 0) return null;

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/80 border-muted-foreground/20 hover:border-muted-foreground/40 transition-all duration-300 hover:shadow-lg hover:shadow-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <RotateCcw className="h-5 w-5" />
          Contas Fixas ({fixedReminders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fixedReminders.map((reminder) => {
          const IconComponent = getIconComponent(reminder.icon);
          const isThisMonthReminder = isThisMonth(new Date(reminder.data!));
          
          return (
            <div 
              key={reminder.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isThisMonthReminder 
                  ? 'bg-background/90 border-border shadow-md' 
                  : 'bg-background/50 border-border/60'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {reminder.descricao}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(reminder.data!), 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                    {reminder.valor && (
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(reminder.valor)}
                      </Badge>
                    )}
                    {getStatusBadge(reminder.status)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 ml-2 flex-shrink-0">
                {reminder.status === 'pending' && isThisMonthReminder && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsPaid(reminder.id)}
                    disabled={processingIds.has(reminder.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                    title="Marcar como pago"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
                {reminder.status !== 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-muted-foreground/30 text-muted-foreground hover:bg-muted h-8 w-8 p-0"
                    title="Já pago este mês"
                    disabled
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteReminder(reminder.id)}
                  disabled={processingIds.has(reminder.id)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  title="Excluir lembrete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}