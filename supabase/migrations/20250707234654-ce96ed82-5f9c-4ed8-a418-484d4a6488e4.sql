-- =====================================================
-- CORREÇÃO DO TRIGGER COM LOGS DETALHADOS PARA DEBUG N8N
-- =====================================================

-- Remover e recriar trigger e função com logs melhorados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar a função handle_new_user com logs detalhados para debug N8N
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log detalhado para debug - mostra tudo que está chegando
  RAISE LOG 'NEW USER TRIGGER FIRED: user_id=%, email=%, confirmed_at=%, metadata=%', 
    NEW.id, NEW.email, NEW.confirmed_at, NEW.raw_user_meta_data;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'PROFILE ALREADY EXISTS: user_id=% - skipping creation', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Criar o perfil
  INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    now(),
    now()
  );
  
  RAISE LOG 'PROFILE CREATED SUCCESSFULLY: user_id=%, email=%, name=%', 
    NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'ERROR CREATING PROFILE: user_id=%, email=%, error_code=%, error_message=%', 
      NEW.id, NEW.email, SQLSTATE, SQLERRM;
    -- Não falhar o trigger para não bloquear o cadastro
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migrar usuários existentes que não têm perfil
DO $$
DECLARE
  user_record RECORD;
  profiles_created INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at, au.updated_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', split_part(user_record.email, '@', 1)),
      user_record.email,
      user_record.created_at,
      user_record.updated_at
    )
    ON CONFLICT (id) DO NOTHING;
    
    profiles_created := profiles_created + 1;
  END LOOP;
  
  RAISE LOG 'MIGRATION COMPLETE: % profiles created for existing users', profiles_created;
END$$;

-- Comentários para documentação
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger com logs detalhados para debug da integração N8N - versão 2025-01-08';
COMMENT ON FUNCTION public.handle_new_user() IS 'Função para criar perfil automaticamente com logs completos para troubleshooting N8N';