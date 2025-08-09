-- Atualizar a função find_or_create_user_by_contact para aceitar user_id opcional
CREATE OR REPLACE FUNCTION public.find_or_create_user_by_contact(
  contact_info text, 
  contact_type text DEFAULT 'email'::text, 
  user_name text DEFAULT NULL::text,
  user_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_profile public.profiles%ROWTYPE;
  target_user_id uuid;
  result jsonb;
BEGIN
  -- Se user_id foi fornecido, usar esse ID, senão gerar um novo
  target_user_id := COALESCE(user_id, gen_random_uuid());
  
  -- Buscar usuário existente primeiro pelo ID (se fornecido)
  IF user_id IS NOT NULL THEN
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE id = user_id 
    LIMIT 1;
    
    IF existing_profile.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'found', true,
        'user_id', existing_profile.id,
        'email', existing_profile.email,
        'phone', existing_profile.phone,
        'name', existing_profile.nome
      );
    END IF;
  END IF;
  
  -- Se não encontrou pelo ID, buscar por contato
  IF contact_type = 'email' THEN
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE email = contact_info 
    LIMIT 1;
  ELSIF contact_type = 'phone' THEN
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE phone = contact_info 
    LIMIT 1;
  END IF;
  
  -- Se usuário existe, retornar dados
  IF existing_profile.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'found', true,
      'user_id', existing_profile.id,
      'email', existing_profile.email,
      'phone', existing_profile.phone,
      'name', existing_profile.nome
    );
  END IF;
  
  -- Se não existe, criar novo usuário com o ID específico
  BEGIN
    INSERT INTO public.profiles (
      id,
      nome,
      email,
      phone,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      COALESCE(user_name, split_part(contact_info, '@', 1)),
      CASE WHEN contact_type = 'email' THEN contact_info 
           WHEN contact_type = 'phone' THEN contact_info || '@temp.webhook.com'
           ELSE contact_info END,
      CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
      now(),
      now()
    );
    
    -- Se telefone foi fornecido, criar verificação automática
    IF contact_type = 'phone' THEN
      INSERT INTO public.phone_verifications (
        user_id,
        phone,
        verification_code,
        verified,
        expires_at,
        created_at,
        updated_at
      ) VALUES (
        target_user_id,
        contact_info,
        'webhook_verified',
        true,
        now() + interval '1 year',
        now(),
        now()
      );
    END IF;
    
    -- Retornar sucesso com dados do usuário criado
    RETURN jsonb_build_object(
      'success', true,
      'found', false,
      'user_id', target_user_id,
      'email', CASE WHEN contact_type = 'email' THEN contact_info 
                    WHEN contact_type = 'phone' THEN contact_info || '@temp.webhook.com'
                    ELSE contact_info END,
      'phone', CASE WHEN contact_type = 'phone' THEN contact_info ELSE NULL END,
      'name', COALESCE(user_name, split_part(contact_info, '@', 1))
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Em caso de erro, retornar detalhes
      RETURN jsonb_build_object(
        'success', false,
        'found', false,
        'error', SQLERRM,
        'user_id', target_user_id
      );
  END;
END;
$function$;