-- Criar categorias padrão essenciais
INSERT INTO public.categorias (nome, tags, userid, created_at, updated_at)
VALUES 
  ('Alimentação', 'comida,supermercado,restaurante', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Transporte', 'combustivel,passagem,uber', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Saúde', 'medico,farmacia,plano', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Casa', 'aluguel,condominio,luz,agua', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Salário', 'trabalho,renda,freelance', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Lazer', 'entretenimento,cinema,viagem', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Educação', 'curso,livro,escola', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Vestuário', 'roupa,calçado,acessorio', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now());