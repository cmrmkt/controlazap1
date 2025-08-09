-- Criar função para verificar se usuário é assinante ativo
CREATE OR REPLACE FUNCTION public.is_active_subscriber(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se usuário existe e está ativo
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND ativo = true 
    AND (
      subscription_end_date IS NULL 
      OR subscription_end_date > now()
    )
  );
END;
$function$;