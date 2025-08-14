-- Remove the overly complex enhanced_transactions_access policy
DROP POLICY IF EXISTS "enhanced_transactions_access" ON public.transacoes;

-- Create a simplified policy that only allows users to access their own transactions
-- The existing "Users can SELECT their transacoes" policy already handles this correctly
-- No additional complex policy needed as the basic RLS policy is sufficient