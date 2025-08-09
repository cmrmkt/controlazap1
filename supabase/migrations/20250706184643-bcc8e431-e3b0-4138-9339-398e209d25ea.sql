-- Corrigir foreign key da tabela categorias para referenciar profiles
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_userid_fkey;

ALTER TABLE public.categorias 
ADD CONSTRAINT categorias_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantir que usuários existentes tenham profiles
INSERT INTO public.profiles (id, email, nome, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as nome,
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;