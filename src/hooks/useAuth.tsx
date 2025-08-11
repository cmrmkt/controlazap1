
import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  changePassword: (newPassword: string) => Promise<{ error: any }>
  resendConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Test Supabase connection first
    const testConnection = async () => {
      try {
        await supabase.from('profiles').select('id').limit(1);
        console.log('Supabase connection established');
      } catch (error) {
        console.error('Supabase connection failed:', error);
      }
    };

    testConnection();

    // Otimizada gestão de estado de auth para carregamento rápido
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check de sessão inicial rápido
    const getInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setSession(null);
          setUser(null);
        } else {
          console.log('Initial session loaded:', session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
        }
        
      } catch (error) {
        console.error('Error loading initial session:', error);
        if (!mounted) return;
        // Set user as null on error to ensure app doesn't break
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Formato de email inválido' } };
      }

      // Validate password strength
      if (password.length < 8) {
        return { error: { message: 'Senha deve ter pelo menos 8 caracteres' } };
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      
      // Attempt automatic confirmation if email is not confirmed
      if (signInError) {
        const msg = String(signInError.message || '').toLowerCase();
        if (msg.includes('email') && msg.includes('confirm')) {
          try {
            await supabase.functions.invoke('confirm-user', {
              body: { email: email.toLowerCase().trim() },
            });
            // Retry sign-in after attempting confirmation
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: email.toLowerCase().trim(),
              password,
            });
            if (!retryError) {
              // Background subscription sync after successful login
              setTimeout(async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.access_token) {
                    console.log('[Auth] Starting subscription sync after login');
                    const syncResponse = await supabase.functions.invoke('sync-subscription', {
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`
                      }
                    });
                    if (syncResponse.error) {
                      console.error('[Auth] Subscription sync error:', syncResponse.error);
                    } else {
                      console.log('[Auth] Subscription sync completed successfully:', syncResponse.data);
                    }
                  }
                } catch (syncError: any) {
                  console.log('[Auth] Subscription sync failed:', syncError.message);
                }
              }, 1000);
            }
            return { error: retryError };
          } catch (confirmErr) {
            // If confirmation fails, return original error
            return { error: signInError };
          }
        }
        return { error: signInError };
      }
      
      // Se login foi bem-sucedido, tentar sincronizar assinatura em background
      if (!signInError) {
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              console.log('[Auth] Starting subscription sync after login');
              const syncResponse = await supabase.functions.invoke('sync-subscription', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              });
              
              if (syncResponse.error) {
                console.error('[Auth] Subscription sync error:', syncResponse.error);
              } else {
                console.log('[Auth] Subscription sync completed successfully:', syncResponse.data);
              }
            }
          } catch (syncError: any) {
            console.log('[Auth] Subscription sync failed:', syncError.message);
          }
        }, 1000);
      }
      
      return { error: signInError };
    } catch (error: any) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Formato de email inválido' } };
      }

      // Validate password strength client-side
      if (password.length < 8) {
        return { error: { message: 'Senha deve ter pelo menos 8 caracteres' } };
      }
      
      // Check for uppercase, lowercase, number and special character
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return { error: { 
          message: 'Senha deve ter: maiúscula, minúscula, número e símbolo especial' 
        }};
      }

      const redirectUrl = `${window.location.origin}/perfil`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData || {}
        }
      });

      // Se o usuário foi criado com sucesso, o perfil será criado automaticamente via trigger

      return { error };
    } catch (error: any) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  }

  const changePassword = async (newPassword: string) => {
    try {
      // Validate password strength client-side
      if (newPassword.length < 8) {
        return { error: { message: 'Nova senha deve ter pelo menos 8 caracteres' } };
      }
      
      // Check for uppercase, lowercase, number and special character
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /\d/.test(newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
      
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return { error: { 
          message: 'Nova senha deve ter: maiúscula, minúscula, número e símbolo especial' 
        }};
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      return { error };
    } catch (error: any) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Formato de email inválido' } };
      }

      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: redirectUrl
      });
      
      return { error };
    } catch (error: any) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  }

  const resendConfirmation = async (email: string) => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Formato de email inválido' } };
      }
      const redirectUrl = `${window.location.origin}/perfil`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: { emailRedirectTo: redirectUrl }
      });
      return { error };
    } catch (error: any) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        changePassword,
        resendConfirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
