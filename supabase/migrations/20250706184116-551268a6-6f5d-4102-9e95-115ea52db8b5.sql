-- Fix foreign key constraint for transacoes table
-- First, drop the existing foreign key constraint that references auth.users
ALTER TABLE public.transacoes DROP CONSTRAINT IF EXISTS transacoes_userid_fkey;

-- Now add the correct foreign key constraint that references profiles table
ALTER TABLE public.transacoes 
ADD CONSTRAINT transacoes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also fix lembretes table foreign key if it exists
ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_userid_fkey;

ALTER TABLE public.lembretes 
ADD CONSTRAINT lembretes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;