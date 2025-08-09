-- Update RLS policies to accept Perfect Pay users with any valid subscription

-- 1. Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "perfect_pay_active_users_can_access_profile" ON public.profiles;
DROP POLICY IF EXISTS "perfect_pay_users_can_update_profile" ON public.profiles;

-- 2. Create new flexible policies for profiles SELECT
CREATE POLICY "active_users_can_access_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id 
  OR ativo = true 
  OR COALESCE(assinaturaid, '') = 'active'
  OR (COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
);

-- 3. Create new flexible policies for profiles UPDATE
CREATE POLICY "active_users_can_update_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id 
  OR ativo = true 
  OR COALESCE(assinaturaid, '') = 'active'
  OR (COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
) 
WITH CHECK (
  auth.uid() = id
);

-- 4. Create policies for other tables to accept active users
CREATE POLICY "active_users_can_view_own_categories" 
ON public.categorias 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = userid 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (ativo = true OR COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
  )
);

CREATE POLICY "active_users_can_view_own_transactions" 
ON public.transacoes 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = userid 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (ativo = true OR COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
  )
);

CREATE POLICY "active_users_can_view_own_reminders" 
ON public.lembretes 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = userid 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (ativo = true OR COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
  )
);

-- 5. Create specific policies for Perfect Pay subscription management
CREATE POLICY "subscription_access_for_active_users" 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (ativo = true OR COALESCE(assinaturaid, '') != '' AND COALESCE(assinaturaid, '') != 'inactive')
  )
);