-- Criar tabela de metas do usuário
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  income_goal DECIMAL(12,2) DEFAULT 0,
  expense_limit DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Adicionar colunas na tabela lembretes
ALTER TABLE public.lembretes 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN repeat_months INTEGER DEFAULT 1,
ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN original_date TIMESTAMP,
ADD COLUMN icon VARCHAR(50) DEFAULT 'calendar';

-- Habilitar RLS na tabela user_goals
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_goals
CREATE POLICY "Users can view their own goals" 
ON public.user_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
ON public.user_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.user_goals 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.user_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at na tabela user_goals
CREATE TRIGGER update_user_goals_updated_at
BEFORE UPDATE ON public.user_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();