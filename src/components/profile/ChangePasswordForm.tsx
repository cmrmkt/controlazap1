import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Lock } from 'lucide-react'

export function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await changePassword(formData.newPassword)
      
      if (error) {
        toast({
          title: "Erro ao alterar senha",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sucesso!",
          description: "Senha alterada com sucesso",
        })
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Alterar senha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Digite sua senha atual"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Mín. 8 caracteres, maiúscula, minúscula, número e símbolo"
              required
            />
            <p className="text-xs text-muted-foreground">
              A senha deve conter: 8+ caracteres, maiúscula, minúscula, número e símbolo especial
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirme sua nova senha"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}