import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface NewPasswordFormProps {
  onBack: () => void
}

export function NewPasswordForm({ onBack }: NewPasswordFormProps) {
  const navigate = useNavigate()
  const { changePassword, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Check if we have a valid recovery session
  const hasValidRecoverySession = () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasTokens = hashParams.get('access_token') && hashParams.get('refresh_token');
    return hasTokens || session;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if we have a valid recovery session
    if (!hasValidRecoverySession()) {
      toast({
        title: 'Sessão de recuperação inválida',
        description: 'O link de recuperação expirou ou é inválido. Solicite um novo.',
        variant: 'destructive',
      })
      onBack()
      return
    }

    // Basic validation
    if (formData.newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'As senhas não coincidem',
        description: 'Verifique e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await changePassword(formData.newPassword)
      if (error) {
        const errorMessage = error.message ?? 'Tente novamente mais tarde.';
        
        // Handle specific error cases
        if (errorMessage.includes('session') || errorMessage.includes('token')) {
          toast({
            title: 'Sessão expirada',
            description: 'O link de recuperação expirou. Solicite um novo link.',
            variant: 'destructive',
          })
          onBack()
        } else {
          toast({
            title: 'Erro ao definir nova senha',
            description: errorMessage,
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Senha atualizada!',
          description: 'Sua senha foi redefinida com sucesso. Redirecionando...',
        })
        
        // Clear URL params and redirect to dashboard
        window.history.replaceState({}, document.title, '/dashboard');
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível redefinir sua senha agora.',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  // Show error if no valid recovery session
  if (!hasValidRecoverySession()) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-start py-8">
          <h1 className="text-lg font-bold text-white mb-2">Link inválido</h1>
          <p className="text-base text-white/80">
            Este link de recuperação é inválido ou expirou.
          </p>
        </div>
        <div className="text-center">
          <Button
            variant="link"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-start py-8">
        <h1 className="text-lg font-bold text-white mb-2">Definir nova senha</h1>
        <p className="text-base text-white/80">
          Crie sua nova senha para acessar o ControlaZap
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium">
            Nova senha
          </Label>
          <Input
            id="new-password"
            type="password"
            placeholder="••••••••"
            value={formData.newPassword}
            onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
            required
            className="h-11"
          />
          <p className="text-xs text-white/70">
            Mínimo de 8 caracteres. Use letras, números e símbolos para mais segurança.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium">
            Confirmar nova senha
          </Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
            required
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            'Definir nova senha'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Button
          variant="link"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Button>
      </div>
    </div>
  )
}
