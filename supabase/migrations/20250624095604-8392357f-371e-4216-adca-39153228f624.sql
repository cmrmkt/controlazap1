
-- Criar tabela subscriptions para armazenar informações completas da assinatura
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan_name TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  cycle TEXT,
  start_date TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  payment_method TEXT,
  card_last_four TEXT,
  card_brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subscription_id)
);

-- Ativar Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Criar política para que usuários só vejam suas próprias assinaturas
CREATE POLICY "Users can view own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

-- Criar política para permitir inserção/atualização (será usado pelas edge functions)
CREATE POLICY "Enable insert for service role" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Enable update for service role" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (true);

-- Criar função para sincronizar dados da assinatura
CREATE OR REPLACE FUNCTION public.sync_subscription_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Quando assinaturaid for atualizado no profiles, podemos triggerar sincronização
  -- Por enquanto apenas logamos a mudança
  RAISE NOTICE 'Subscription ID updated for user %: %', NEW.id, NEW.assinaturaid;
  RETURN NEW;
END;
$$;

-- Criar trigger para monitorar mudanças no assinaturaid
DROP TRIGGER IF EXISTS on_subscription_id_changed ON public.profiles;
CREATE TRIGGER on_subscription_id_changed
  AFTER UPDATE OF assinaturaid ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.assinaturaid IS DISTINCT FROM NEW.assinaturaid)
  EXECUTE PROCEDURE public.sync_subscription_data();
