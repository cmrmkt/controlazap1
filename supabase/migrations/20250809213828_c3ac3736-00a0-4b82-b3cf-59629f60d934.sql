-- Ensure lembretes has expected columns (idempotent)
ALTER TABLE public.lembretes
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS repeat_months INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS original_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'calendar';

-- Enable RLS on all relevant tables (idempotent - no-op if already enabled)
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies: user can view and update only own profile (create only if missing)
DO $$
BEGIN
  CREATE POLICY "Users can SELECT their profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Users can UPDATE their profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- categorias policies (CRUD own rows)
DO $$ BEGIN
  CREATE POLICY "Users can SELECT their categorias" ON public.categorias
  FOR SELECT TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can INSERT their categorias" ON public.categorias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can UPDATE their categorias" ON public.categorias
  FOR UPDATE TO authenticated USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can DELETE their categorias" ON public.categorias
  FOR DELETE TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- transacoes policies (CRUD own rows) - keep existing enhanced select if already present
DO $$ BEGIN
  CREATE POLICY "Users can SELECT their transacoes" ON public.transacoes
  FOR SELECT TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can INSERT their transacoes" ON public.transacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can UPDATE their transacoes" ON public.transacoes
  FOR UPDATE TO authenticated USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can DELETE their transacoes" ON public.transacoes
  FOR DELETE TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- lembretes policies (CRUD own rows)
DO $$ BEGIN
  CREATE POLICY "Users can SELECT their lembretes" ON public.lembretes
  FOR SELECT TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can INSERT their lembretes" ON public.lembretes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can UPDATE their lembretes" ON public.lembretes
  FOR UPDATE TO authenticated USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can DELETE their lembretes" ON public.lembretes
  FOR DELETE TO authenticated USING (auth.uid() = userid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscriptions policies (CRUD own rows)
DO $$ BEGIN
  CREATE POLICY "Users can SELECT their subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can INSERT their subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can UPDATE their subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can DELETE their subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_goals policies (CRUD own rows)
DO $$ BEGIN
  CREATE POLICY "Users can SELECT their user_goals" ON public.user_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can INSERT their user_goals" ON public.user_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can UPDATE their user_goals" ON public.user_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can DELETE their user_goals" ON public.user_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Block client access to internal tables by enabling RLS and adding no policies (system_audit/system_config)
-- No additional policies created; access will be denied by default under RLS.

-- Ensure unique constraint/index for upsert logic on user_goals
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_goals_user_month_year
ON public.user_goals(user_id, month, year)
WHERE user_id IS NOT NULL;
