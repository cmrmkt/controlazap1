-- Corrigir constraint de chave estrangeira da tabela system_audit
ALTER TABLE public.system_audit 
DROP CONSTRAINT IF EXISTS system_audit_user_id_fkey;

-- Recriar a constraint permitindo SET NULL ao deletar usuário
ALTER TABLE public.system_audit 
ADD CONSTRAINT system_audit_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Melhorar a função handle_new_user para criar perfis mais completos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Inserir perfil completo com todos os dados disponíveis
  INSERT INTO public.profiles (
    id, 
    nome, 
    email, 
    phone, 
    avatar_url,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'phone', 
      NEW.raw_user_meta_data->>'phone_number'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  
  -- Log da criação para debug
  RAISE LOG 'Profile created for user: % with email: %', NEW.id, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro detalhado mas não impede o registro
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar função para sincronizar usuários existentes sem perfil
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  profiles_created INTEGER := 0;
BEGIN
  -- Encontrar usuários sem perfil e criar perfis para eles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        nome, 
        email, 
        phone, 
        avatar_url,
        created_at, 
        updated_at
      )
      VALUES (
        user_record.id,
        COALESCE(
          user_record.raw_user_meta_data->>'full_name', 
          user_record.raw_user_meta_data->>'name', 
          user_record.raw_user_meta_data->>'display_name',
          split_part(user_record.email, '@', 1)
        ),
        user_record.email,
        COALESCE(
          user_record.raw_user_meta_data->>'phone', 
          user_record.raw_user_meta_data->>'phone_number'
        ),
        user_record.raw_user_meta_data->>'avatar_url',
        user_record.created_at,
        NOW()
      );
      
      profiles_created := profiles_created + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar profile retroativo para usuário %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE LOG 'Sincronização concluída. % perfis criados.', profiles_created;
  RETURN profiles_created;
END;
$$;

-- Executar sincronização dos perfis em falta
SELECT public.sync_missing_profiles();

-- Limpar registros órfãos na tabela system_audit
UPDATE public.system_audit 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.profiles);

-- Criar função para validação de integridade
CREATE OR REPLACE FUNCTION public.validate_user_data_integrity()
RETURNS TABLE(
  table_name TEXT,
  issue_type TEXT,
  count BIGINT,
  description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar usuários sem perfil
  RETURN QUERY
  SELECT 
    'auth.users'::TEXT,
    'missing_profile'::TEXT,
    COUNT(*)::BIGINT,
    'Usuários sem perfil correspondente'::TEXT
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL;
  
  -- Verificar perfis órfãos
  RETURN QUERY
  SELECT 
    'profiles'::TEXT,
    'orphaned_profile'::TEXT,
    COUNT(*)::BIGINT,
    'Perfis sem usuário correspondente'::TEXT
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE au.id IS NULL;
  
  -- Verificar registros de auditoria com user_id inválido
  RETURN QUERY
  SELECT 
    'system_audit'::TEXT,
    'invalid_user_id'::TEXT,
    COUNT(*)::BIGINT,
    'Registros de auditoria com user_id inválido'::TEXT
  FROM public.system_audit sa
  WHERE sa.user_id IS NOT NULL 
  AND sa.user_id NOT IN (SELECT id FROM public.profiles);
  
END;
$$;

-- Validar integridade após as correções
SELECT * FROM public.validate_user_data_integrity();