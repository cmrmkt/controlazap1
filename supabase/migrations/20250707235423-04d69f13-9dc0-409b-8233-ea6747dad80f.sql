-- =====================================================
-- CORREÇÃO ESTRUTURAL COMPLETA - IMPLEMENTAÇÃO DO PLANO
-- =====================================================

-- 1. CORRIGIR FUNÇÃO handle_new_user QUE ESTÁ INSERINDO NA TABELA ERRADA
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar função corrigida para inserir em profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log detalhado para debug N8N
  RAISE LOG 'TRIGGER FIRED: user_id=%, email=%, metadata=%', 
    NEW.id, NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar se o perfil já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'PROFILE EXISTS: user_id=% - skipping', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Criar perfil na tabela CORRETA (profiles, não users)
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
    RAISE LOG 'ERROR CREATING PROFILE: user_id=%, error=%', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ADICIONAR FOREIGN KEYS ESSENCIAIS
-- Categorias -> Profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categorias_userid_fkey' 
        AND table_name = 'categorias'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.categorias 
        ADD CONSTRAINT categorias_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE LOG 'Added FK: categorias -> profiles';
    END IF;
END$$;

-- Transações -> Profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transacoes_userid_fkey' 
        AND table_name = 'transacoes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.transacoes 
        ADD CONSTRAINT transacoes_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE LOG 'Added FK: transacoes -> profiles';
    END IF;
END$$;

-- Transações -> Categorias
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transacoes_category_id_fkey' 
        AND table_name = 'transacoes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.transacoes 
        ADD CONSTRAINT transacoes_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES public.categorias(id) ON DELETE CASCADE;
        RAISE LOG 'Added FK: transacoes -> categorias';
    END IF;
END$$;

-- Lembretes -> Profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lembretes_userid_fkey' 
        AND table_name = 'lembretes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.lembretes 
        ADD CONSTRAINT lembretes_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE LOG 'Added FK: lembretes -> profiles';
    END IF;
END$$;

-- Subscriptions -> Profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_user_id_fkey' 
        AND table_name = 'subscriptions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE LOG 'Added FK: subscriptions -> profiles';
    END IF;
END$$;

-- 3. LIMPAR DADOS ÓRFÃOS E GARANTIR CONSISTÊNCIA
-- Migrar usuários do auth.users que não têm perfil
DO $$
DECLARE
    user_record RECORD;
    migrated_count INTEGER := 0;
BEGIN
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at, au.updated_at
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
            VALUES (
                user_record.id,
                COALESCE(
                    user_record.raw_user_meta_data->>'full_name', 
                    user_record.raw_user_meta_data->>'name', 
                    split_part(user_record.email, '@', 1)
                ),
                user_record.email,
                user_record.created_at,
                user_record.updated_at
            );
            migrated_count := migrated_count + 1;
            RAISE LOG 'MIGRATED PROFILE: user_id=%, email=%', user_record.id, user_record.email;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'MIGRATION ERROR: user_id=%, error=%', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'MIGRATION COMPLETE: % profiles migrated', migrated_count;
END$$;

-- 4. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON FUNCTION public.handle_new_user() IS 'Função corrigida para criar perfis em public.profiles - versão 2025-01-08';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger corrigido com logs para debug N8N - versão 2025-01-08';