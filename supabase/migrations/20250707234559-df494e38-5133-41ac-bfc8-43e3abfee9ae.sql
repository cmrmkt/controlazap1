-- =====================================================
-- CORREÇÃO DA ESTRUTURA - VERIFICANDO CONSTRAINTS EXISTENTES
-- =====================================================

-- 1. Adicionar foreign key em profiles para auth.users (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END$$;

-- 2. Adicionar foreign key em categorias para profiles (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categorias_userid_fkey' 
        AND table_name = 'categorias'
    ) THEN
        ALTER TABLE public.categorias 
        ADD CONSTRAINT categorias_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END$$;

-- 3. Remover e recriar trigger e função com logs melhorados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar a função handle_new_user com logs detalhados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log detalhado para debug
  RAISE LOG 'NEW USER TRIGGER: user_id=%, email=%, metadata=%', 
    NEW.id, NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'PROFILE EXISTS: user_id=%', NEW.id;
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
  
  RAISE LOG 'PROFILE CREATED: user_id=%, email=%', NEW.id, NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'PROFILE ERROR: user_id=%, error=%', NEW.id, SQLERRM;
    -- Continuar mesmo com erro para não bloquear o cadastro
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Migrar usuários existentes que não têm perfil
INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as nome,
  au.email,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Comentários para documentação  
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger com logs detalhados para debug N8N integration';
COMMENT ON FUNCTION public.handle_new_user() IS 'Função para criar perfil com logs completos para troubleshooting';