-- 1A) Lembretes: garantir colunas (idempotente)
ALTER TABLE public.lembretes
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS repeat_months INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS original_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'calendar';

-- 1B) user_goals: criar se não existir com esquema correto e RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_goals'
  ) THEN
    CREATE TABLE public.user_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      income_goal NUMERIC DEFAULT 0,
      expense_limit NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, month, year)
    );

    ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Garantir colunas principais caso a tabela exista com esquema diferente
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS income_goal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índice único (idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goals_unique
  ON public.user_goals(user_id, month, year);

-- Políticas RLS (criar somente se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can view their own goals'
  ) THEN
    CREATE POLICY "Users can view their own goals"
      ON public.user_goals FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can create their own goals'
  ) THEN
    CREATE POLICY "Users can create their own goals"
      ON public.user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can update their own goals'
  ) THEN
    CREATE POLICY "Users can update their own goals"
      ON public.user_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can delete their own goals'
  ) THEN
    CREATE POLICY "Users can delete their own goals"
      ON public.user_goals FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Função/trigger para updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_goals_set_updated_at'
  ) THEN
    CREATE TRIGGER user_goals_set_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;