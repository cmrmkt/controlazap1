import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SignupFormProps {
  onBackToLogin: () => void
}

export function SignupForm({ onBackToLogin }: SignupFormProps) {
  const handleCreateAccount = () => {
    window.open('https://poupae.online/', '_blank')
  }

  return (
    <div className="w-full mx-auto">
      <div className="text-start py-4 sm:py-6 lg:py-8">
        <h1 className="text-base sm:text-lg font-bold text-white mb-2">
          Criar conta
        </h1>
        <p className="text-sm sm:text-base text-white/80">
          Acesse o site oficial para se cadastrar
        </p>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <Button
          onClick={handleCreateAccount}
          className="w-full h-10 sm:h-11 bg-primary hover:bg-primary/90"
        >
          Criar conta em poupae.online
        </Button>
      </div>
      
      <div className="mt-4 sm:mt-6 text-center">
        <Button
          variant="link"
          onClick={onBackToLogin}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Já tem uma conta? Faça login
        </Button>
      </div>
    </div>
  )
}