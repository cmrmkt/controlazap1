-- Fase 1: Correções Críticas de Segurança

-- 1. Criar políticas RLS para system_audit (apenas administradores podem acessar)
CREATE POLICY "Only admins can view audit logs" 
ON public.system_audit 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Only admins can insert audit logs" 
ON public.system_audit 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 2. Criar políticas RLS para system_config (apenas administradores, exceto configurações públicas)
CREATE POLICY "Anyone can view public system config" 
ON public.system_config 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Only admins can view all system config" 
ON public.system_config 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Only admins can modify system config" 
ON public.system_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 3. Adicionar política INSERT para profiles (permitir criação do próprio perfil)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Fase 2: Correções de Segurança nas Funções

-- 4. Corrigir search_path nas funções existentes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_category(category_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.categorias 
    WHERE id = category_uuid AND userid = auth.uid()
  );
$$;

-- 5. Criar função auxiliar para verificar se usuário é admin (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_id),
    false
  );
$$;