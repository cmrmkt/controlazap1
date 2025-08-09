-- Create phone_verifications table for WhatsApp verification
CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own phone verifications" 
ON public.phone_verifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone verifications" 
ON public.phone_verifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone verifications" 
ON public.phone_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone verifications" 
ON public.phone_verifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_phone_verifications_updated_at
BEFORE UPDATE ON public.phone_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add basic password validation functions
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    LENGTH(password) >= 8 AND
    password ~ '[A-Z]' AND
    password ~ '[a-z]' AND
    password ~ '[0-9]' AND
    password ~ '[^A-Za-z0-9]'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_password_compromised(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic check for common weak passwords
  RETURN password IN ('12345678', 'password', '123456789', 'qwerty123', 'abc123456');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_metadata->>'full_name', user_metadata->>'name', split_part(user_email, '@', 1)),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;