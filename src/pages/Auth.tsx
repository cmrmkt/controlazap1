
import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';

type AuthMode = 'login' | 'forgot' | 'reset';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    try {
      const hasRecoverySearch = new URLSearchParams(window.location.search).get('type') === 'recovery'
      const hasRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
      if (hasRecoverySearch || hasRecoveryHash) {
        setMode('reset')
      }
    } catch (e) {
      // noop
    }
  }, [])


  return (
    <div className="min-h-screen relative overflow-hidden futuristic-bg">
      {/* Financial Background Effects */}
      <div className="absolute inset-0 financial-charts"></div>
      <div className="absolute inset-0 floating-money"></div>
      <div className="absolute inset-0 progress-bars"></div>
      <div className="absolute inset-0 data-metrics"></div>
      <div className="absolute inset-0 savings-particles"></div>
      
      {/* Base futuristic effects */}
      <div className="absolute inset-0 floating-orbs"></div>
      <div className="absolute inset-0 energy-waves"></div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/10 backdrop-blur-xl bg-card/80">        
          {mode === 'login' && (
            <LoginForm 
              onForgotPassword={() => setMode('forgot')}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordForm onBack={() => setMode('login')} />
          )}
          {mode === 'reset' && (
            <NewPasswordForm onBack={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
