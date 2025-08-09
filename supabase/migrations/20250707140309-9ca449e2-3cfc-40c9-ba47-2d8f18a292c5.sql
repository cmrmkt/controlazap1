-- Create password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if password meets strength requirements:
  -- - At least 8 characters
  -- - Contains uppercase letter
  -- - Contains lowercase letter
  -- - Contains number
  -- - Contains special character
  RETURN (
    LENGTH(password) >= 8 AND
    password ~ '[A-Z]' AND
    password ~ '[a-z]' AND
    password ~ '[0-9]' AND
    password ~ '[^A-Za-z0-9]'
  );
END;
$$;

-- Create password compromise check function (simplified implementation)
CREATE OR REPLACE FUNCTION public.is_password_compromised(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Simple implementation - check against common passwords
  -- In production, this would check against a breach database
  RETURN password IN (
    '123456', 'password', '123456789', '12345678', '12345',
    '1234567', '1234567890', 'qwerty', 'abc123', 'password123'
  );
END;
$$;

-- Create phone verification table for WhatsApp integration
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for phone verifications
CREATE POLICY "Users can manage their own phone verifications" ON public.phone_verifications
FOR ALL USING (auth.uid() = user_id);

-- Create function to verify phone code
CREATE OR REPLACE FUNCTION public.verify_phone_code(
  p_user_id UUID,
  p_phone TEXT,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  stored_code TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
  is_verified BOOLEAN;
BEGIN
  -- Get the stored verification data
  SELECT verification_code, phone_verifications.expires_at, verified 
  INTO stored_code, expires_at, is_verified
  FROM public.phone_verifications 
  WHERE user_id = p_user_id AND phone = p_phone
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Check if code exists and hasn't expired
  IF stored_code IS NULL THEN
    RETURN false;
  END IF;
  
  IF expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- Check if code matches
  IF stored_code = p_code THEN
    -- Mark as verified
    UPDATE public.phone_verifications 
    SET verified = true, updated_at = now()
    WHERE user_id = p_user_id AND phone = p_phone;
    
    -- Update user profile with verified phone
    UPDATE public.profiles 
    SET phone = p_phone, updated_at = now()
    WHERE id = p_user_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create trigger for phone_verifications updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phone_verifications_updated_at
BEFORE UPDATE ON public.phone_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();