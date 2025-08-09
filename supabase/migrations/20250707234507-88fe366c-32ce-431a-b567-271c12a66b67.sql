-- =====================================================
-- CORREÇÃO COMPLETA DA ESTRUTURA DE FOREIGN KEYS E TRIGGERS
-- =====================================================

-- 1. Adicionar foreign key em profiles para auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Adicionar foreign key em categorias para profiles
ALTER TABLE public.categorias 
ADD CONSTRAINT categorias_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Adicionar foreign key em transacoes para profiles  
ALTER TABLE public.transacoes 
ADD CONSTRAINT transacoes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Adicionar foreign key em lembretes para profiles
ALTER TABLE public.lembretes 
ADD CONSTRAINT lembretes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Verificar se a função handle_new_user existe e recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar a função handle_new_user com tratamento de erros melhorado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log para debug
  RAISE LOG 'Creating profile for user: %', NEW.id;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'Profile already exists for user: %', NEW.id;
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
  
  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Não falhar o cadastro por causa do perfil
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Migrar usuários existentes que não têm perfil
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
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger que cria automaticamente um perfil na tabela profiles quando um usuário é registrado - com logs para debug';
COMMENT ON FUNCTION public.handle_new_user() IS 'Função para criar perfil de usuário automaticamente com tratamento de erros robusto';