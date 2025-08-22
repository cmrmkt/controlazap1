-- Corrigir a função find_or_create_user_by_contact para resolver o erro gen_salt
CREATE OR REPLACE FUNCTION public.find_or_create_user_by_contact(
  contact_info text, 
  contact_type text DEFAULT 'email'::text, 
  user_name text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Usuário não encontrado, criar novo UUID para o perfil apenas
  new_user_id := gen_random_uuid();
  
  -- Não vamos mais criar usuário no auth.users diretamente
  -- O usuário será criado quando fizer login pela primeira vez
  -- Apenas criar/atualizar perfil
  INSERT INTO profiles (
    id,
    nome,
    email,
    phone,
    whatsapp,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_name,
    CASE WHEN contact_type = 'email' THEN contact_info ELSE NULL END,
    CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
    CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, profiles.nome),
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    whatsapp = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp),
    ativo = EXCLUDED.ativo,
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
$function$;