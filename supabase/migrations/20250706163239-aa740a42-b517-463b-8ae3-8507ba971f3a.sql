-- Configure Auth Security Settings
-- 1. Set OTP Expiry to 15 minutes (900 seconds) instead of default long expiry
INSERT INTO auth.config (key, value) VALUES 
('otp_expiry', '900')
ON CONFLICT (key) DO UPDATE SET value = '900';

-- 2. Set Password Reset expiry to 1 hour (3600 seconds)
INSERT INTO auth.config (key, value) VALUES 
('password_reset_expiry', '3600')
ON CONFLICT (key) DO UPDATE SET value = '3600';

-- 3. Enable Password Strength Requirements
INSERT INTO auth.config (key, value) VALUES 
('password_min_length', '8')
ON CONFLICT (key) DO UPDATE SET value = '8';

-- 4. Set Session Timeout to 24 hours
INSERT INTO auth.config (key, value) VALUES 
('jwt_expiry', '86400')
ON CONFLICT (key) DO UPDATE SET value = '86400';

-- 5. Enable Account Lockout Protection (max 5 failed attempts)
INSERT INTO auth.config (key, value) VALUES 
('max_password_attempts', '5')
ON CONFLICT (key) DO UPDATE SET value = '5';

-- 6. Set Account Lockout Duration to 15 minutes
INSERT INTO auth.config (key, value) VALUES 
('password_lockout_duration', '900')
ON CONFLICT (key) DO UPDATE SET value = '900';

-- 7. Enable Email Rate Limiting (max 3 emails per hour)
INSERT INTO auth.config (key, value) VALUES 
('rate_limit_email_sent', '3')
ON CONFLICT (key) DO UPDATE SET value = '3';

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

-- Create trigger to audit auth attempts
CREATE TABLE IF NOT EXISTS public.auth_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on auth_audit
ALTER TABLE public.auth_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Only admins can view auth audit logs" ON public.auth_audit
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);