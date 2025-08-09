import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Phone, Bot, CheckCircle, AlertCircle, Settings, Send } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface WhatsAppProfile {
  phone: string
  verified: boolean
  created_at: string
}

interface AIMessage {
  id: string
  message: string
  response: string
  created_at: string
}

export default function WhatsApp() {
  const { user } = useAuth()
  const { isLoading, sendVerificationCode, verifyCode } = useWhatsApp()
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null)
  const [step, setStep] = useState<'setup' | 'verify' | 'connected'>('setup')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [testMessage, setTestMessage] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [reminderEnabled, setReminderEnabled] = useState(true)

  useEffect(() => {
    if (user) {
      checkWhatsAppStatus()
      loadMessages()
    }
  }, [user])

  const checkWhatsAppStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('whatsapp, created_at')
        .eq('id', user?.id)
        .single()

      if (error) throw error

      if (data && data.whatsapp) {
        setProfile({
          phone: data.whatsapp,
          verified: true,
          created_at: data.created_at
        })
        setStep('connected')
      }
    } catch (error) {
      console.error('Erro ao verificar status do WhatsApp:', error)
    }
  }

  const loadMessages = async () => {
    try {
      // TODO: Implementar busca de mensagens reais da IA no banco de dados
      setMessages([])
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  const handleSendCode = async () => {
    if (!phone.trim()) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone válido",
        variant: "destructive",
      })
      return
    }

    const success = await sendVerificationCode(phone)
    if (success) {
      setStep('verify')
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite o código de verificação",
        variant: "destructive",
      })
      return
    }

    const success = await verifyCode(phone, verificationCode)
    if (success) {
      setStep('connected')
      await checkWhatsAppStatus()
    }
  }

  const handleTestMessage = async () => {
    if (!testMessage.trim()) return

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-chat', {
        body: {
          message: testMessage,
          phone: profile?.phone
        }
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Mensagem de teste enviada!",
      })
      setTestMessage('')
      await loadMessages()
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error)
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem de teste",
        variant: "destructive",
      })
    }
  }

  const setupStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Conectar WhatsApp
        </CardTitle>
        <CardDescription>
          Configure sua integração com WhatsApp para receber lembretes e usar a IA financeira
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Número do WhatsApp (com código do país)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+5511999999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button onClick={handleSendCode} disabled={isLoading} className="w-full">
          {isLoading ? 'Enviando...' : 'Enviar Código de Verificação'}
        </Button>
      </CardContent>
    </Card>
  )

  const verifyStep = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Verificar Código
        </CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos que enviamos para {phone}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código de Verificação</Label>
          <Input
            id="code"
            type="text"
            placeholder="123456"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleVerifyCode} disabled={isLoading} className="flex-1">
            {isLoading ? 'Verificando...' : 'Verificar Código'}
          </Button>
          <Button onClick={() => setStep('setup')} variant="outline">
            Voltar
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const connectedStep = (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            WhatsApp Conectado
          </CardTitle>
          <CardDescription>
            Sua conta está verificada e pronta para usar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{profile?.phone}</p>
              <p className="text-sm text-muted-foreground">
                Conectado em {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : ''}
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verificado
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different functionalities */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="messages">Mensagens IA</TabsTrigger>
          <TabsTrigger value="test">Testar</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações da IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Assistente IA Financeiro</Label>
                  <p className="text-sm text-muted-foreground">
                    Responder perguntas sobre suas finanças via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={setAiEnabled}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes Automáticos</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes de contas e metas financeiras
                  </p>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Consultas Financeiras</h4>
                    <p className="text-sm text-muted-foreground">
                      "Quanto gastei este mês?", "Qual meu saldo atual?"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Lembretes Inteligentes</h4>
                    <p className="text-sm text-muted-foreground">
                      Alertas de vencimento, metas e orçamento
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Adicionar Transações</h4>
                    <p className="text-sm text-muted-foreground">
                      "Gastei R$ 25 no almoço hoje"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Relatórios por Voz</h4>
                    <p className="text-sm text-muted-foreground">
                      Receba resumos mensais automaticamente
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Conversas IA</CardTitle>
              <CardDescription>
                Suas últimas interações com o assistente financeiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-blue-600">Você:</p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-green-500 mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-green-600">Assistente IA:</p>
                          <p className="text-sm">{msg.response}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                  <p className="text-sm text-muted-foreground">
                    Envie uma mensagem via WhatsApp para começar!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Integração</CardTitle>
              <CardDescription>
                Envie uma mensagem de teste para verificar se tudo está funcionando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testMessage">Mensagem de Teste</Label>
                <Textarea
                  id="testMessage"
                  placeholder="Ex: Qual foi meu gasto total este mês?"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleTestMessage} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem de Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp + IA Financeira</h1>
        <p className="text-muted-foreground">
          Configure sua integração com WhatsApp para ter um assistente financeiro no seu celular
        </p>
      </div>

      {step === 'setup' && setupStep}
      {step === 'verify' && verifyStep}
      {step === 'connected' && connectedStep}
    </div>
  )
}