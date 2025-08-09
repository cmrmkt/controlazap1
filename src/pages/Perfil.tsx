import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PhoneInput } from '@/components/ui/phone-input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { SubscriptionInfo } from '@/components/profile/SubscriptionInfo'
import { WhatsAppStatus } from '@/components/profile/WhatsAppStatus'

import { useAutoWhatsAppValidation } from '@/hooks/useAutoWhatsAppValidation'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useProfileData } from '@/hooks/useProfileData'
import { toast } from '@/hooks/use-toast'
import { Camera, User, Trash2, Settings, CreditCard, Shield, MessageSquare, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, DollarSign, ExternalLink, Users } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface Profile {
  nome: string
  phone: string
  avatar_url?: string
  email?: string
}

export default function Perfil() {
  const { user, signOut } = useAuth()
  const { subscription, isLoading: subscriptionLoading, syncSubscription } = useSubscription()
  const { profileData, loading: profileLoading, refreshData } = useProfileData()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const activeTab = searchParams.get('tab') || 'profile'
  const [profile, setProfile] = useState<Profile>({
    nome: '',
    phone: '',
    email: ''
  })
  const [currentCountryCode, setCurrentCountryCode] = useState('+55')
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [profileCompleteness, setProfileCompleteness] = useState(0)
  const isMounted = useRef(true)
  
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  
  // Auto WhatsApp validation hook
  useAutoWhatsAppValidation({
    phone: profile.phone,
    onValidationComplete: (validated) => {
      if (isMounted.current) {
        console.log('WhatsApp validation completed:', validated);
      }
    }
  });

  useEffect(() => {
    if (user && isMounted.current) {
      console.log('User loaded, checking if new user...');
      checkIfNewUser()
    }
  }, [user])

  // Sync local state with profileData from hook
  useEffect(() => {
    if (profileData && isMounted.current) {
      setProfile({
        nome: profileData.nome || '',
        phone: profileData.phone || '',
        avatar_url: profileData.avatar_url || undefined,
        email: profileData.email || user?.email || ''
      })

      // Parse the phone number to separate country code and number
      const phone = profileData.phone || ''
      if (phone) {
        if (phone.startsWith('+')) {
          const brazilMatch = phone.match(/^(\+55)(.*)$/)
          const usMatch = phone.match(/^(\+1)(.*)$/)
          const argMatch = phone.match(/^(\+54)(.*)$/)
          const generalMatch = phone.match(/^(\+\d{1,4})(.*)$/)
          
          if (brazilMatch) {
            setCurrentCountryCode('+55')
            setCurrentPhoneNumber(brazilMatch[2])
          } else if (usMatch) {
            setCurrentCountryCode('+1')
            setCurrentPhoneNumber(usMatch[2])
          } else if (argMatch) {
            setCurrentCountryCode('+54')
            setCurrentPhoneNumber(argMatch[2])
          } else if (generalMatch) {
            setCurrentCountryCode(generalMatch[1])
            setCurrentPhoneNumber(generalMatch[2])
          } else {
            setCurrentCountryCode('+55')
            setCurrentPhoneNumber(phone)
          }
        } else {
          setCurrentCountryCode('+55')
          setCurrentPhoneNumber(phone)
        }
      } else {
        setCurrentCountryCode('+55')
        setCurrentPhoneNumber('')
      }
    }
  }, [profileData, user])

  useEffect(() => {
    if (isMounted.current) {
      calculateProfileCompleteness()
    }
  }, [profile, currentPhoneNumber])

  const checkIfNewUser = async () => {
    // Check if user was created recently (within last 10 minutes)
    const userCreatedAt = new Date(user?.created_at || '')
    const now = new Date()
    const diffMinutes = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60)
    setIsNewUser(diffMinutes < 10)
  }

  const calculateProfileCompleteness = () => {
    let completeness = 0
    const requiredFields = 4 // nome, phone, email, avatar
    
    if (profile.nome?.trim()) completeness++
    if (currentPhoneNumber?.trim()) completeness++
    if (profile.email?.trim()) completeness++
    if (profile.avatar_url) completeness++

    setProfileCompleteness(Math.round((completeness / requiredFields) * 100))
  }

  // This function is no longer needed as data loading is handled by useProfileData hook
  // Keeping it for now in case of manual refresh needs

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Only combine if we have both country code and phone number
      let fullPhone = ''
      
      if (currentPhoneNumber.trim()) {
        fullPhone = currentCountryCode + currentPhoneNumber.replace(/\D/g, '')
      }

      console.log('Saving profile with phone:', fullPhone)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          nome: profile.nome,
          phone: fullPhone,
          avatar_url: profile.avatar_url,
          email: profile.email,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      
      // Update local state and refresh data
      setProfile(prev => ({ ...prev, phone: fullPhone }))
      await refreshData()
      
      toast({ title: "Perfil atualizado com sucesso!" })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user?.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      
      toast({ title: "Avatar atualizado com sucesso!" })
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePhoneChange = (phone: string) => {
    console.log('Phone changed to:', phone)
    setCurrentPhoneNumber(phone)
  }

  const handleCountryChange = (country_code: string) => {
    console.log('Country code changed to:', country_code)
    setCurrentCountryCode(country_code)
  }

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      toast({
        title: "Erro",
        description: "O email de confirmação não confere",
        variant: "destructive",
      })
      return
    }

    setDeleting(true)

    try {
      // First delete all user data from profiles table
      console.log('Deletando perfil do usuário...')
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id)

      if (profileError) {
        console.error('Erro ao deletar perfil:', profileError)
        throw profileError
      }

      // Delete all user transactions - fix column name
      console.log('Deletando transações do usuário...')
      const { error: transacoesError } = await supabase
        .from('transacoes')
        .delete()
        .eq('userid', user?.id)

      if (transacoesError) {
        console.error('Erro ao deletar transações:', transacoesError)
        throw transacoesError
      }

      // Delete all user reminders - fix column name
      console.log('Deletando lembretes do usuário...')
      const { error: lembretesError } = await supabase
        .from('lembretes')
        .delete()
        .eq('userid', user?.id)

      if (lembretesError) {
        console.error('Erro ao deletar lembretes:', lembretesError)
        throw lembretesError
      }

      console.log('Dados do usuário deletados com sucesso')

      toast({
        title: "Conta removida com sucesso",
        description: "Sua conta e todos os dados foram permanentemente removidos",
      })

      // Sign out and redirect
      await signOut()
      navigate('/auth')
    } catch (error: any) {
      console.error('Erro completo ao remover conta:', error)
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setConfirmEmail('')
    }
  }

  const isMobile = useIsMobile()

  if (profileLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {isNewUser && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary">Bem-vindo à plataforma!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete seu perfil para começar a usar todas as funcionalidades.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Completude do perfil</span>
                      <span className="font-medium">{profileCompleteness}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${profileCompleteness}%` }}
                      />
                    </div>
                  </div>
                  {profileCompleteness === 100 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-2"
                    >
                      Ir para Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center md:text-left">
        <h1 className="text-4xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2">Gerencie suas informações pessoais, assinatura e configurações de segurança</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'profile') {
          navigate('/perfil')
        } else {
          navigate(`/perfil?tab=${value}`)
        }
      }} className="w-full">
        <TabsList className={cn(
          "grid w-full grid-cols-3",
          isMobile ? "h-12" : "lg:w-[400px]"
        )}>
          <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            {!isMobile && "Perfil"}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            {!isMobile && "Assinatura"}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            {!isMobile && "Segurança"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {profile.nome ? getInitials(profile.nome) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{profile.nome || 'Sem nome'}</h3>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input
                      id="nome"
                      value={profile.nome}
                      onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <PhoneInput
                      id="phone"
                      value={currentPhoneNumber}
                      countryCode={currentCountryCode}
                      onValueChange={handlePhoneChange}
                      onCountryChange={handleCountryChange}
                      required
                    />
                  </div>
                </div>

                 <Button 
                   type="submit" 
                   disabled={saving}
                   className="w-full md:w-auto"
                 >
                   {saving ? 'Salvando...' : 'Salvar Alterações'}
                 </Button>
               </form>
             </CardContent>
           </Card>

           <Separator />

            {/* WhatsApp Status Section */}
            <WhatsAppStatus phone={profile.phone} />
         </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionInfo />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ChangePasswordForm />

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A remoção da conta é permanente e não pode ser desfeita. Todos os seus dados, incluindo transações e lembretes, serão permanentemente apagados.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover Conta Permanentemente
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Remoção de Conta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é irreversível. Todos os seus dados serão permanentemente apagados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirm-email">
                          Digite seu email para confirmar: <span className="font-semibold">{user?.email}</span>
                        </Label>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder="Confirme seu email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setConfirmEmail('')}
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleting || confirmEmail !== user?.email}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? 'Removendo...' : 'Remover Conta'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      </div>
    </PageWrapper>
  )
}
