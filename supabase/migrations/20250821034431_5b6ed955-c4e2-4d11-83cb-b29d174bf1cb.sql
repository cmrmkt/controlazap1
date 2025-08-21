-- Criar função RPC para encontrar ou criar usuário por contato
CREATE OR REPLACE FUNCTION public.find_or_create_user_by_contact(
  contact_info TEXT,
  contact_type TEXT DEFAULT 'email',
  user_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  auth_user_record RECORD;
  new_user_id UUID;
  result JSON;
BEGIN
  -- Validar parâmetros de entrada
  IF contact_info IS NULL OR contact_info = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Contact info is required'
    );
  END IF;

  -- Buscar usuário existente
  IF contact_type = 'email' THEN
    -- Buscar por email no auth.users
    SELECT * INTO auth_user_record 
    FROM auth.users 
    WHERE email = contact_info
    LIMIT 1;
    
    IF FOUND THEN
      -- Buscar perfil correspondente
      SELECT * INTO user_record
      FROM profiles
      WHERE id = auth_user_record.id;
      
      RETURN json_build_object(
        'success', true,
        'found', true,
        'user_id', auth_user_record.id,
        'email', auth_user_record.email,
        'phone', COALESCE(user_record.phone, user_record.whatsapp),
        'name', COALESCE(user_record.nome, user_name)
      );
    END IF;
  ELSE
    -- Buscar por telefone no profiles
    SELECT * INTO user_record
    FROM profiles
    WHERE phone = contact_info OR whatsapp = contact_info
    LIMIT 1;
    
    IF FOUND THEN
      -- Buscar usuário auth correspondente
      SELECT * INTO auth_user_record
      FROM auth.users
      WHERE id = user_record.id;
      
      RETURN json_build_object(
        'success', true,
        'found', true,
        'user_id', user_record.id,
        'email', COALESCE(auth_user_record.email, user_record.email),
        'phone', contact_info,
        'name', COALESCE(user_record.nome, user_name)
      );
    END IF;
  END IF;

  -- Usuário não encontrado, criar novo
  new_user_id := gen_random_uuid();
  
  -- Criar usuário no auth.users apenas se for email
  IF contact_type = 'email' THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      contact_info,
      crypt('temp_password_' || extract(epoch from now()), gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"webhook","providers":["webhook"]}',
      json_build_object('name', user_name, 'full_name', user_name),
      false,
      'authenticated',
      'authenticated'
    );
  END IF;

  -- Criar ou atualizar perfil
  INSERT INTO profiles (
    id,
    nome,
    email,
    phone,
    whatsapp,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_name,
    CASE WHEN contact_type = 'email' THEN contact_info ELSE NULL END,
    CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
    CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, profiles.nome),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    whatsapp = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp),
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'found', false,
    'user_id', new_user_id,
    'email', CASE WHEN contact_type = 'email' THEN contact_info ELSE NULL END,
    'phone', CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
    'name', user_name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;