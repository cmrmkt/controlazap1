-- Fix RLS policies and circular dependencies for Perfect Pay authentication issues

-- 1. Drop all existing phone_verifications policies (table doesn't exist)
DROP POLICY IF EXISTS "authenticated_users_can_view_own_phone_verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_phone_verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_phone_verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_phone_verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "service_role_can_manage_phone_verifications" ON public.phone_verifications;

-- 2. Fix is_admin() function to avoid circular dependency
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Use direct query without RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND COALESCE(is_admin, false) = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Add service role policies for profiles (allows Perfect Pay user creation)
CREATE POLICY "service_role_can_manage_all_profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Add service role policies for subscriptions
CREATE POLICY "service_role_can_manage_all_subscriptions" 
ON public.subscriptions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Create fallback policy for Perfect Pay users with assinaturaid = 'active'
CREATE POLICY "perfect_pay_active_users_can_access_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  COALESCE(assinaturaid, '') = 'active' 
  OR auth.uid() = id
);

-- 6. Allow Perfect Pay users to update their own profiles
CREATE POLICY "perfect_pay_users_can_update_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id 
  OR COALESCE(assinaturaid, '') = 'active'
) 
WITH CHECK (
  auth.uid() = id
);

-- 7. Grant necessary permissions to service_role for authentication flows
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.categorias TO service_role;
GRANT ALL ON public.transacoes TO service_role;
GRANT ALL ON public.lembretes TO service_role;
GRANT ALL ON public.system_audit TO service_role;
GRANT ALL ON public.system_config TO service_role;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant function execution permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;