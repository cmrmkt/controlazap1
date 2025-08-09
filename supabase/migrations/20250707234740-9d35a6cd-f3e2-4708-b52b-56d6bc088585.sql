-- =====================================================
-- CORREÇÃO ESTRUTURAL SEM TOCAR EM AUTH.USERS
-- =====================================================

-- 1. Verificar e adicionar foreign keys nas tabelas públicas apenas
DO $$
BEGIN
    -- Foreign key em categorias para profiles (se não existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categorias_userid_fkey' 
        AND table_name = 'categorias'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.categorias 
        ADD CONSTRAINT categorias_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key: categorias -> profiles';
    ELSE
        RAISE NOTICE 'Foreign key categorias -> profiles already exists';
    END IF;
END$$;

-- 2. Recriar função standalone para uso manual quando necessário
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(
    p_user_id uuid, 
    p_email text, 
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Log para debug
    RAISE LOG 'MANUAL PROFILE CREATION: user_id=%, email=%, metadata=%', 
        p_user_id, p_email, p_metadata;
    
    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE LOG 'PROFILE EXISTS: user_id=%', p_user_id;
        RETURN true;
    END IF;
    
    -- Criar perfil
    INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
    VALUES (
        p_user_id,
        COALESCE(p_metadata->>'full_name', p_metadata->>'name', split_part(p_email, '@', 1)),
        p_email,
        now(),
        now()
    );
    
    RAISE LOG 'PROFILE CREATED: user_id=%, email=%', p_user_id, p_email;
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'ERROR CREATING PROFILE: user_id=%, error=%', p_user_id, SQLERRM;
        RETURN false;
END;
$$;

-- 3. Migrar perfis para usuários existentes que não têm
DO $$
DECLARE
    user_record RECORD;
    profiles_created INTEGER := 0;
    total_users INTEGER := 0;
BEGIN
    -- Contar usuários sem perfil
    SELECT COUNT(*) INTO total_users
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL;
    
    RAISE LOG 'MIGRATION START: Found % users without profiles', total_users;
    
    -- Criar perfis para usuários sem perfil
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
            profiles_created := profiles_created + 1;
            RAISE LOG 'PROFILE MIGRATED: user_id=%, email=%', user_record.id, user_record.email;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'MIGRATION ERROR: user_id=%, error=%', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'MIGRATION COMPLETE: Created % profiles out of % missing users', profiles_created, total_users;
END$$;

-- Comentários
COMMENT ON FUNCTION public.create_user_profile_manual(uuid, text, jsonb) IS 'Função para criação manual de perfil de usuário - para usar no N8N quando o trigger não funcionar';