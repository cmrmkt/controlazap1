import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateReminders: (months: number[]) => void;
  reminderDescription?: string;
}

const months = [
  { value: 1, name: 'Janeiro', short: 'Jan' },
  { value: 2, name: 'Fevereiro', short: 'Fev' },
  { value: 3, name: 'Março', short: 'Mar' },
  { value: 4, name: 'Abril', short: 'Abr' },
  { value: 5, name: 'Maio', short: 'Mai' },
  { value: 6, name: 'Junho', short: 'Jun' },
  { value: 7, name: 'Julho', short: 'Jul' },
  { value: 8, name: 'Agosto', short: 'Ago' },
  { value: 9, name: 'Setembro', short: 'Set' },
  { value: 10, name: 'Outubro', short: 'Out' },
  { value: 11, name: 'Novembro', short: 'Nov' },
  { value: 12, name: 'Dezembro', short: 'Dez' },
];

export function MonthSelectorDialog({ 
  open, 
  onOpenChange, 
  onCreateReminders, 
  reminderDescription 
}: MonthSelectorDialogProps) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const toggleMonth = (monthValue: number) => {
    setSelectedMonths(prev => 
      prev.includes(monthValue)
        ? prev.filter(m => m !== monthValue)
        : [...prev, monthValue]
    );
  };

  const handleCreate = () => {
    if (selectedMonths.length > 0) {
      onCreateReminders(selectedMonths);
      setSelectedMonths([]);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedMonths([]);
    onOpenChange(false);
  };

  const selectAll = () => {
    setSelectedMonths(months.map(m => m.value));
  };

  const clearAll = () => {
    setSelectedMonths([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Selecionar Meses
          </DialogTitle>
          <DialogDescription>
            Escolha os meses em que deseja repetir este lembrete:
            <br />
            <span className="font-medium text-primary">"{reminderDescription || 'Lembrete'}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botões de controle */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="flex-1"
            >
              Selecionar Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="flex-1"
            >
              Limpar Seleção
            </Button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((month) => {
              const isSelected = selectedMonths.includes(month.value);
              return (
                <Button
                  key={month.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMonth(month.value)}
                  className={cn(
                    "flex flex-col h-12 relative transition-all duration-200",
                    isSelected && "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  <span className="text-xs font-medium">{month.short}</span>
                  <span className="text-xs opacity-80">{month.value}</span>
                  {isSelected && (
                    <Check className="absolute top-1 right-1 h-3 w-3" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Preview */}
          {selectedMonths.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Meses selecionados ({selectedMonths.length}):</p>
              <div className="flex flex-wrap gap-1">
                {selectedMonths
                  .sort((a, b) => a - b)
                  .map(monthValue => {
                    const month = months.find(m => m.value === monthValue);
                    return (
                      <Badge key={monthValue} variant="secondary" className="text-xs">
                        {month?.short}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedMonths.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Criar {selectedMonths.length} Lembretes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}