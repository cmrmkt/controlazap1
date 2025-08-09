-- Create alternative auth configuration system since auth.config doesn't exist
-- This will handle OTP expiry and leaked password protection at application level

-- Create auth_settings table to manage auth configurations
CREATE TABLE IF NOT EXISTS public.auth_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage auth settings
CREATE POLICY "Only admins can manage auth settings" ON public.auth_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert auth settings
INSERT INTO public.auth_settings (setting_key, setting_value, description) VALUES
('otp_expiry_minutes', '5', 'OTP expiry time in minutes'),
('enable_leaked_password_protection', 'true', 'Enable leaked password protection'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Create function to get auth setting
CREATE OR REPLACE FUNCTION public.get_auth_setting(key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT setting_value FROM public.auth_settings WHERE setting_key = key LIMIT 1;
$$;

-- Create function to validate OTP expiry
CREATE OR REPLACE FUNCTION public.is_otp_expired(created_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT (EXTRACT(EPOCH FROM (now() - created_at)) / 60) > 
    COALESCE((SELECT setting_value::INTEGER FROM public.auth_settings WHERE setting_key = 'otp_expiry_minutes'), 5);
$$;

-- Create function to check for leaked passwords (simplified version)
CREATE OR REPLACE FUNCTION public.is_password_compromised(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  common_passwords TEXT[] := ARRAY[
    '123456', 'password', '123456789', '12345678', '12345', '1234567', 
    '1234567890', 'qwerty', 'abc123', 'million2', '000000', '1234',
    'iloveyou', 'aaron431', 'password1', 'qqww1122', '123', 'omgpop',
    '123321', '654321', 'qwertyuiop', 'qwer1234', '123abc', 'password123'
  ];
  is_enabled BOOLEAN;
BEGIN
  -- Check if leaked password protection is enabled
  SELECT (setting_value = 'true') INTO is_enabled 
  FROM public.auth_settings 
  WHERE setting_key = 'enable_leaked_password_protection';
  
  -- If not enabled, return false (password is not compromised)
  IF NOT COALESCE(is_enabled, false) THEN
    RETURN false;
  END IF;
  
  -- Check against common passwords
  RETURN password = ANY(common_passwords);
END;
$$;

-- Update trigger for auth_settings
CREATE TRIGGER update_auth_settings_updated_at
BEFORE UPDATE ON public.auth_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();