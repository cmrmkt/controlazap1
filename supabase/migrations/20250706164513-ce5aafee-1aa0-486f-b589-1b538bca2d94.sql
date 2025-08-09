-- Fix Function Search Path Mutable issues

-- 1. Fix Function Search Path Mutable for validate_password_strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check minimum length
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Check for uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Check for lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Check for digit
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  -- Check for special character
  IF password !~ '[^A-Za-z0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Fix Function Search Path Mutable for log_auth_attempt
CREATE OR REPLACE FUNCTION public.log_auth_attempt(
  p_user_id UUID,
  p_event_type TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.auth_audit (
    user_id,
    event_type,
    success,
    error_message,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_success,
    p_error_message,
    p_metadata
  );
END;
$$;