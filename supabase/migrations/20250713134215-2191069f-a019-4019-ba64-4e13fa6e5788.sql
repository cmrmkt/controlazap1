-- Etapa 1: Corrigir sincronização de dados do usuário
-- Sincronizar assinaturaid com subscription_id e corrigir dados faltantes

-- Atualizar perfil com dados de subscription quando existir subscription ativa
UPDATE public.profiles 
SET 
  assinaturaid = COALESCE(assinaturaid, s.subscription_id),
  subscription_status = COALESCE(subscription_status, s.status),
  updated_at = now()
FROM public.subscriptions s
WHERE profiles.id = s.user_id 
  AND s.status = 'active'
  AND (profiles.assinaturaid IS NULL OR profiles.subscription_status IS NULL);

-- Criar função para manter sincronização automática entre profiles e subscriptions
CREATE OR REPLACE FUNCTION sync_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando subscription for criada/atualizada, atualizar profile
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET 
      assinaturaid = NEW.subscription_id,
      subscription_status = NEW.status,
      updated_at = now()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  END IF;
  
  -- Quando subscription for deletada, limpar dados do profile
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET 
      assinaturaid = NULL,
      subscription_status = 'inactive',
      updated_at = now()
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS sync_profile_subscription_trigger ON public.subscriptions;
CREATE TRIGGER sync_profile_subscription_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_profile_subscription();

-- Melhorar função has_active_subscription para reconhecer mais formatos
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Primeiro verificar na tabela subscriptions
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = user_id_param AND status = 'active'
  ) OR 
  -- Se não encontrar, verificar no profile com validação ampliada
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id_param 
    AND (
      -- Status ativo ou subscription_status ativa
      subscription_status = 'active' OR
      -- AssinaturaId indica assinatura ativa (múltiplos formatos)
      assinaturaid = 'active' OR
      assinaturaid LIKE 'pp_%' OR 
      assinaturaid LIKE 'PPSUB%' OR
      assinaturaid LIKE 'sub_%' OR
      -- Qualquer ID que não seja vazio ou inativo
      (assinaturaid IS NOT NULL 
       AND assinaturaid != '' 
       AND assinaturaid != 'inactive' 
       AND assinaturaid != 'no-subscription'
       AND assinaturaid != 'cancelled')
    )
  );
$$;

-- Adicionar log de auditoria para sincronização
CREATE OR REPLACE FUNCTION log_sync_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log apenas mudanças significativas
    IF OLD.assinaturaid != NEW.assinaturaid OR OLD.subscription_status != NEW.subscription_status OR OLD.whatsapp != NEW.whatsapp THEN
      INSERT INTO public.system_audit (
        user_id, action, table_name, record_id, 
        old_data, new_data, created_at
      ) VALUES (
        NEW.id, 'sync_update', 'profiles', NEW.id::text,
        jsonb_build_object(
          'assinaturaid', OLD.assinaturaid,
          'subscription_status', OLD.subscription_status,
          'whatsapp', OLD.whatsapp
        ),
        jsonb_build_object(
          'assinaturaid', NEW.assinaturaid,
          'subscription_status', NEW.subscription_status,
          'whatsapp', NEW.whatsapp
        ),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para log de auditoria (apenas para admins)
DROP TRIGGER IF EXISTS profile_sync_audit_trigger ON public.profiles;
CREATE TRIGGER profile_sync_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_sync_activity();