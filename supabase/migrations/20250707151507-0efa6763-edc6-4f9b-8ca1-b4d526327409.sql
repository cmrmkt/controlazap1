-- =====================================================
-- CORREÇÃO DO TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIS
-- =====================================================

-- Verificar se a função handle_new_user existe e recriar se necessário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar o trigger para executar a função quando um novo usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Migrar usuários existentes que não têm perfil na tabela profiles
INSERT INTO public.profiles (id, nome, email, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as nome,
  au.email,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Comentário para documentação
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger que cria automaticamente um perfil na tabela profiles quando um usuário é registrado';