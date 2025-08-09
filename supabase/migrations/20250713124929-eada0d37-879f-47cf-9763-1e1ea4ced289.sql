-- Criar perfil do usuário primeiro
INSERT INTO public.profiles (
    id, 
    nome, 
    email, 
    phone, 
    whatsapp, 
    assinaturaid, 
    ativo, 
    created_at, 
    updated_at
)
VALUES (
    'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c',
    'João Silva',
    'joao.silva@email.com',
    '+5511999887766',
    '+5511999887766',
    'PPSUB_BASIC_001',
    true,
    now(),
    now()
)
ON CONFLICT (id) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    assinaturaid = EXCLUDED.assinaturaid,
    ativo = EXCLUDED.ativo,
    updated_at = now();