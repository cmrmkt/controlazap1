
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LoginFormProps {
  onForgotPassword: () => void
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, resendConfirmation } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      console.log('Attempting login for:', email)
      const { error } = await signIn(email.trim(), password)

      if (error) {
        console.error('Login error:', error)
        
        // Improved error handling
        let errorMessage = 'Erro desconhecido'
        const msg = String(error.message || '').toLowerCase()
        if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (msg.includes('too_many_requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos'
        } else if (msg.includes('email_not_confirmed') || msg.includes('email not confirmed')) {
          errorMessage = 'Confirme seu email antes de fazer login'
        } else if (msg.includes('signup_disabled')) {
          errorMessage = 'Cadastros temporariamente desabilitados'
        } else {
          errorMessage = String(error.message || 'Erro desconhecido')
        }
        
        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        console.log('Login successful')
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        })
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error)
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    }

    setLoading(false)
  }

  const handleSubscribeClick = () => {
    window.open('https://www.asaas.com/c/zyevzm4ajw9p3yz2', '_blank')
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast({
        title: 'Informe seu email',
        description: 'Digite seu email para reenviar a confirmação.',
        variant: 'destructive',
      })
      return
    }
    setResendLoading(true)
    try {
      const { error } = await resendConfirmation(email.trim())
      if (error) {
        toast({
          title: 'Falha ao reenviar',
          description: error.message ?? 'Tente novamente mais tarde.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Email enviado',
          description: 'Verifique sua caixa de entrada para confirmar seu cadastro.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível reenviar o email de confirmação.',
        variant: 'destructive',
      })
    }
    setResendLoading(false)
  }

  return (
    <div className="w-full mx-auto">
      <div className="text-start py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col items-start mb-4">
          <img 
            src="/lovable-uploads/bc282fcb-3349-4781-a836-6db740525a5d.png" 
            alt="ControlaZap Logo" 
            className="h-16 sm:h-20 w-auto object-contain mb-4 max-w-full"
            onError={(e) => {
              e.currentTarget.src = "/lovable-uploads/bc282fcb-3349-4781-a836-6db740525a5d.png";
            }}
          />
        </div>
        <h1 className="text-base sm:text-lg font-bold text-white mb-2">
          Bem-vindo ao ControlaZap
        </h1>
        <p className="text-sm sm:text-base text-white/80">
          Entre na sua conta para continuar
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 sm:h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 sm:h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-10 sm:h-11 bg-primary hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>
      
      <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-center">
        <Button
          onClick={handleSubscribeClick}
          variant="outline"
          className="w-full h-10 sm:h-11 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Assine Agora
        </Button>
        
        <div className="mt-4 sm:mt-6 text-center">
          <Button
            variant="link"
            onClick={onForgotPassword}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Esqueceu sua senha?
          </Button>
          <Button
            variant="link"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {resendLoading ? 'Reenviando...' : 'Não recebeu o email de confirmação? Reenviar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
