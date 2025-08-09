
-- Criar função para lidar com novos usuários
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

-- Criar trigger para executar a função quando um novo usuário se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Migrar usuários existentes que não têm perfil
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

-- Ativar Row Level Security na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar política para que usuários só vejam/editem seus próprios perfis
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Permitir inserção de perfis (será usado pelo trigger)
CREATE POLICY "Enable insert for authenticated users only" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
