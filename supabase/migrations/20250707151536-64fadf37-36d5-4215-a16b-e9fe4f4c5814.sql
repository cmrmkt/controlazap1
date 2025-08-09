-- =====================================================
-- SOLUÇÃO ALTERNATIVA: FUNÇÃO PARA CRIAR PERFIL MANUALMENTE
-- =====================================================

-- Recriar a função handle_new_user para usar como RPC
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text, user_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN true; -- Perfil já existe
  END IF;
  
  -- Criar o perfil
  INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
  VALUES (
    user_id,
    COALESCE(user_metadata->>'full_name', user_metadata->>'name', split_part(user_email, '@', 1)),
    user_email,
    now(),
    now()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retornar false
    RETURN false;
END;
$$;

-- Migrar usuários existentes que não têm perfil
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    PERFORM public.create_user_profile(
      user_record.id, 
      user_record.email, 
      COALESCE(user_record.raw_user_meta_data, '{}'::jsonb)
    );
  END LOOP;
END $$;

-- Comentário para documentação
COMMENT ON FUNCTION public.create_user_profile(uuid, text, jsonb) IS 'Função para criar perfil de usuário manualmente após registro no Supabase Auth';