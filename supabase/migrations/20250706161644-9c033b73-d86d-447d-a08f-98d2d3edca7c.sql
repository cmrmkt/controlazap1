-- Adjust transacoes table columns to match user requirements
-- Rename criado_em to created_at
ALTER TABLE public.transacoes RENAME COLUMN criado_em TO created_at;

-- Rename data to quando  
ALTER TABLE public.transacoes RENAME COLUMN data TO quando;

-- Make sure usuario_id is not nullable for data integrity
ALTER TABLE public.transacoes ALTER COLUMN usuario_id SET NOT NULL;

-- Make sure id is not nullable
ALTER TABLE public.transacoes ALTER COLUMN id SET NOT NULL;

-- Clear any existing mock/test data
DELETE FROM public.transacoes;