import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserGoals {
  id?: string;
  income_goal: number;
  expense_limit: number;
  month: number;
  year: number;
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const loadGoals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGoals({
          id: data.id,
          income_goal: Number(data.income_goal),
          expense_limit: Number(data.expense_limit),
          month: data.month,
          year: data.year
        });
      } else {
        // Criar metas padrão se não existirem
        setGoals({
          income_goal: 5000,
          expense_limit: 4000,
          month: currentMonth,
          year: currentYear
        });
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async (newGoals: Partial<UserGoals>) => {
    if (!user) return false;

    try {
      const goalData = {
        user_id: user.id,
        month: currentMonth,
        year: currentYear,
        income_goal: newGoals.income_goal ?? goals?.income_goal ?? 0,
        expense_limit: newGoals.expense_limit ?? goals?.expense_limit ?? 0
      };

      // Use upsert with unique constraint to handle duplicates properly
      const { data, error } = await supabase
        .from('user_goals')
        .upsert(goalData, { 
          onConflict: 'user_id,month,year',
          ignoreDuplicates: false 
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      setGoals({
        id: data.id,
        income_goal: Number(data.income_goal),
        expense_limit: Number(data.expense_limit),
        month: data.month,
        year: data.year
      });

      return true;
    } catch (error) {
      console.error('Error saving goals:', error);
      return false;
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  return {
    goals,
    loading,
    saveGoals,
    refetch: loadGoals
  };
}