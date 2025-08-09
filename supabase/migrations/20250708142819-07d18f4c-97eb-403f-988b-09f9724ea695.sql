-- Corrigir tipos de dados na tabela transacoes
-- Alterar o campo 'quando' de text para timestamp with time zone
ALTER TABLE public.transacoes ALTER COLUMN quando TYPE timestamp with time zone USING quando::timestamp with time zone;

-- Garantir que quando tenha um valor padrão se for NULL
UPDATE public.transacoes SET quando = created_at WHERE quando IS NULL;

-- Adicionar constraint para garantir que quando não seja NULL no futuro
ALTER TABLE public.transacoes ALTER COLUMN quando SET NOT NULL;
ALTER TABLE public.transacoes ALTER COLUMN quando SET DEFAULT now();

-- Garantir que o campo valor seja sempre numérico e não NULL
UPDATE public.transacoes SET valor = 0 WHERE valor IS NULL;
ALTER TABLE public.transacoes ALTER COLUMN valor SET NOT NULL;
ALTER TABLE public.transacoes ALTER COLUMN valor SET DEFAULT 0;

-- Garantir que o campo tipo tenha valores válidos
UPDATE public.transacoes SET tipo = 'despesa' WHERE tipo IS NULL OR tipo NOT IN ('receita', 'despesa');
ALTER TABLE public.transacoes ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE public.transacoes ALTER COLUMN tipo SET DEFAULT 'despesa';

-- Adicionar constraint para validar valores do tipo
ALTER TABLE public.transacoes ADD CONSTRAINT check_tipo_valid CHECK (tipo IN ('receita', 'despesa'));