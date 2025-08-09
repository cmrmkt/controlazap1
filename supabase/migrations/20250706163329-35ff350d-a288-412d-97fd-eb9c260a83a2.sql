-- Create auth audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.auth_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on auth_audit
ALTER TABLE public.auth_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_audit
CREATE POLICY "Only admins can view auth audit logs" ON public.auth_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "System can insert auth audit logs" ON public.auth_audit
FOR INSERT WITH CHECK (true);

-- Create function to validate password strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to log auth attempts
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

-- Create security configuration table
CREATE TABLE IF NOT EXISTS public.security_config (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security_config
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- Create policies for security_config
CREATE POLICY "Only admins can manage security config" ON public.security_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert security configurations
INSERT INTO public.security_config (key, value, description) VALUES
('password_min_length', '8', 'Minimum password length'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes'),
('password_require_uppercase', 'true', 'Require uppercase letter in password'),
('password_require_lowercase', 'true', 'Require lowercase letter in password'),
('password_require_number', 'true', 'Require number in password'),
('password_require_special', 'true', 'Require special character in password'),
('session_timeout_hours', '24', 'Session timeout in hours')
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at on security_config
CREATE TRIGGER update_security_config_updated_at
BEFORE UPDATE ON public.security_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();