-- Remove a constraint existente de chave estrangeira
ALTER TABLE lembretes DROP CONSTRAINT IF EXISTS lembretes_userid_fkey;

-- Recria a constraint com ON DELETE CASCADE para manter integridade referencial
ALTER TABLE lembretes 
ADD CONSTRAINT lembretes_userid_fkey 
FOREIGN KEY (userid) 
REFERENCES profiles(id) 
ON DELETE CASCADE;