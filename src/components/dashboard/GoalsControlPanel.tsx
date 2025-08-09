import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";

interface GoalsData {
  income_goal: number;
  expense_limit: number;
  current_income: number;
  current_expenses: number;
}

interface GoalsControlPanelProps {
  transacoes: any[];
}

export function GoalsControlPanel({ transacoes }: GoalsControlPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<GoalsData>({
    income_goal: 5000,
    expense_limit: 4000,
    current_income: 0,
    current_expenses: 0
  });
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Calcular receitas e despesas do mês atual
  const calculateCurrentValues = () => {
    if (!transacoes?.length) {
      return { current_income: 0, current_expenses: 0 };
    }

    const currentMonthTransactions = transacoes.filter(t => {
      if (!t?.quando) return false;
      
      try {
        const transactionDate = new Date(t.quando);
        if (isNaN(transactionDate.getTime())) return false;
        
        return transactionDate.getMonth() + 1 === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    });

    const income = currentMonthTransactions
      .filter(t => t?.tipo === 'receita')
      .reduce((sum, t) => {
        const valor = Number(t?.valor);
        return sum + (isNaN(valor) ? 0 : Math.abs(valor));
      }, 0);

    const expenses = currentMonthTransactions
      .filter(t => t?.tipo === 'despesa')
      .reduce((sum, t) => {
        const valor = Number(t?.valor);
        return sum + (isNaN(valor) ? 0 : Math.abs(valor));
      }, 0);

    return { 
      current_income: Number(income.toFixed(2)), 
      current_expenses: Number(expenses.toFixed(2)) 
    };
  };

  // Carregar metas do banco
  const loadGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      const currentValues = calculateCurrentValues();
      
      if (data) {
        setGoals({
          income_goal: Number(data.income_goal),
          expense_limit: Number(data.expense_limit),
          ...currentValues
        });
      } else {
        setGoals(prev => ({ ...prev, ...currentValues }));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar metas no banco - versão corrigida
  const saveGoals = async (newGoals: Partial<GoalsData>) => {
    if (!user) return false;

    try {
      // Primeiro, verificar se já existe um registro
      const { data: existing, error: selectError } = await supabase
        .from('user_goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (selectError) throw selectError;

      const goalData = {
        income_goal: newGoals.income_goal ?? goals.income_goal,
        expense_limit: newGoals.expense_limit ?? goals.expense_limit
      };

      if (existing) {
        // UPDATE - registro já existe
        const { error } = await supabase
          .from('user_goals')
          .update(goalData)
          .eq('id', existing.id);
          
        if (error) throw error;
      } else {
        // INSERT - criar novo registro
        const { error } = await supabase
          .from('user_goals')
          .insert({
            user_id: user.id,
            month: currentMonth,
            year: currentYear,
            ...goalData
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Meta atualizada",
        description: "Suas metas foram salvas com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: "Erro ao salvar metas",
        description: "Não foi possível salvar as metas. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user, transacoes]);

  useEffect(() => {
    if (!loading) {
      const currentValues = calculateCurrentValues();
      setGoals(prev => ({ ...prev, ...currentValues }));
    }
  }, [transacoes, loading]);

  // Adicionar debounce para evitar múltiplas chamadas
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const debouncedSave = (newGoals: Partial<GoalsData>) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeout = setTimeout(() => {
      saveGoals(newGoals);
    }, 500); // Aguarda 500ms antes de salvar
    
    setSaveTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleIncomeGoalChange = (value: number[]) => {
    const newGoal = Math.max(0, value[0]); // Prevenir valores negativos
    setGoals(prev => ({ ...prev, income_goal: newGoal }));
    debouncedSave({ income_goal: newGoal });
  };

  const handleIncomeInputChange = (value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setGoals(prev => ({ ...prev, income_goal: numValue }));
    debouncedSave({ income_goal: numValue });
  };

  const handleExpenseLimitChange = (value: number[]) => {
    const newLimit = Math.max(0, value[0]); // Prevenir valores negativos
    setGoals(prev => ({ ...prev, expense_limit: newLimit }));
    debouncedSave({ expense_limit: newLimit });
  };

  const handleExpenseInputChange = (value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setGoals(prev => ({ ...prev, expense_limit: numValue }));
    debouncedSave({ expense_limit: numValue });
  };

  const incomeProgress = goals.income_goal > 0 ? (goals.current_income / goals.income_goal) * 100 : 0;
  const expenseProgress = goals.expense_limit > 0 ? (goals.current_expenses / goals.expense_limit) * 100 : 0;

  const getIncomeAdvice = () => {
    if (incomeProgress >= 100) return { text: "🎉 Parabéns! Meta de receita alcançada!", type: "success" };
    if (incomeProgress >= 80) return { text: "🚀 Você está quase lá! Continue focado.", type: "warning" };
    if (incomeProgress >= 50) return { text: "💪 No meio do caminho! Mantenha o ritmo.", type: "info" };
    return { text: "🎯 Foque em oportunidades de renda extra.", type: "default" };
  };

  const getExpenseAdvice = () => {
    if (expenseProgress >= 100) return { text: "⚠️ Limite ultrapassado! Revise seus gastos.", type: "danger" };
    if (expenseProgress >= 80) return { text: "🚨 Cuidado! Você está próximo do limite.", type: "warning" };
    if (expenseProgress >= 50) return { text: "📊 Controle seus gastos para não ultrapassar.", type: "info" };
    return { text: "✅ Gastos sob controle! Continue assim.", type: "success" };
  };

  const incomeAdvice = getIncomeAdvice();
  const expenseAdvice = getExpenseAdvice();

  if (loading) return <div className="animate-pulse bg-muted h-40 rounded-lg" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Meta de Receitas */}
      <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-5 w-5" />
            Meta de Receitas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta: {formatCurrency(goals.income_goal)}</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-300">{incomeProgress.toFixed(1)}%</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-input" className="text-xs text-muted-foreground">Digite o valor específico:</Label>
              <Input
                id="income-input"
                type="number"
                min="0"
                step="100"
                value={goals.income_goal}
                onChange={(e) => handleIncomeInputChange(e.target.value)}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <Slider
              value={[goals.income_goal]}
              onValueChange={handleIncomeGoalChange}
              max={1000000}
              step={100}
              className="w-full"
            />
          </div>
          
          <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Atual:</span>
              <span className="font-bold text-lg text-emerald-800 dark:text-emerald-200">{formatCurrency(goals.current_income)}</span>
            </div>
            <div className="w-full bg-emerald-200/60 dark:bg-emerald-800/40 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 h-4 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${Math.min(incomeProgress, 100)}%` }}
              />
            </div>
          </div>

          <div className={`p-2 rounded-lg text-sm ${
            incomeAdvice.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
            incomeAdvice.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            incomeAdvice.type === 'info' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {incomeAdvice.text}
          </div>
        </CardContent>
      </Card>

      {/* Limite de Gastos */}
      <Card className="group relative overflow-hidden bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Target className="h-5 w-5" />
            Limite de Gastos do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Limite: {formatCurrency(goals.expense_limit)}</span>
              <span className="font-medium text-red-700 dark:text-red-300">{expenseProgress.toFixed(1)}%</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-input" className="text-xs text-muted-foreground">Digite o valor específico:</Label>
              <Input
                id="expense-input"
                type="number"
                min="0"
                step="100"
                value={goals.expense_limit}
                onChange={(e) => handleExpenseInputChange(e.target.value)}
                className="h-8 text-sm"
                placeholder="0"
              />
            </div>
            <Slider
              value={[goals.expense_limit]}
              onValueChange={handleExpenseLimitChange}
              max={1000000}
              step={100}
              className="w-full"
            />
          </div>
          
          <div className="bg-red-50/80 dark:bg-red-900/20 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Atual:</span>
              <span className="font-bold text-lg text-red-800 dark:text-red-200">{formatCurrency(goals.current_expenses)}</span>
            </div>
            <div className="w-full bg-red-200/60 dark:bg-red-800/40 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 shadow-lg ${
                  expenseProgress >= 100 ? 'bg-gradient-to-r from-red-600 to-red-700' :
                  expenseProgress >= 80 ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                  'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${Math.min(expenseProgress, 100)}%` }}
              />
            </div>
          </div>

          <div className={`p-2 rounded-lg text-sm ${
            expenseAdvice.type === 'danger' ? 'bg-red-100 text-red-800' :
            expenseAdvice.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            expenseAdvice.type === 'info' ? 'bg-blue-100 text-blue-800' :
            'bg-emerald-100 text-emerald-800'
          }`}>
            {expenseAdvice.text}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}