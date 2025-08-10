-- Fix FK on categorias.userid to cascade deletes when a profile is removed
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_userid_fkey;

ALTER TABLE public.categorias
ADD CONSTRAINT categorias_userid_fkey
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;