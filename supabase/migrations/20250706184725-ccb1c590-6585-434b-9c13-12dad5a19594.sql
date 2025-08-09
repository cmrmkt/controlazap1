-- Primeiro, criar profiles para todos os users que existem em categorias mas não em profiles
INSERT INTO public.profiles (id, email, nome, created_at)
SELECT DISTINCT
  c.userid,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Usuário') as nome,
  now()
FROM public.categorias c
LEFT JOIN public.profiles p ON p.id = c.userid
LEFT JOIN auth.users au ON au.id = c.userid
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Fazer o mesmo para transacoes
INSERT INTO public.profiles (id, email, nome, created_at)
SELECT DISTINCT
  t.userid,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Usuário') as nome,
  now()
FROM public.transacoes t
LEFT JOIN public.profiles p ON p.id = t.userid
LEFT JOIN auth.users au ON au.id = t.userid
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- E para lembretes
INSERT INTO public.profiles (id, email, nome, created_at)
SELECT DISTINCT
  l.userid,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Usuário') as nome,
  now()
FROM public.lembretes l
LEFT JOIN public.profiles p ON p.id = l.userid
LEFT JOIN auth.users au ON au.id = l.userid  
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Agora corrigir a foreign key da tabela categorias
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_userid_fkey;

ALTER TABLE public.categorias 
ADD CONSTRAINT categorias_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;