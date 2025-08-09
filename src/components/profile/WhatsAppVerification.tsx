import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { Loader2, MessageSquare, Check } from 'lucide-react';

interface WhatsAppVerificationProps {
  initialPhone?: string;
  onVerificationComplete?: (phone: string) => void;
}

export function WhatsAppVerification({ 
  initialPhone = '', 
  onVerificationComplete 
}: WhatsAppVerificationProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const { isLoading, sendVerificationCode, verifyCode } = useWhatsApp();

  const formatPhone = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as Brazilian phone number
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 9) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const getCleanPhone = (formattedPhone: string) => {
    const digits = formattedPhone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSendCode = async () => {
    if (!phone) return;
    
    const cleanPhone = getCleanPhone(phone);
    const success = await sendVerificationCode(cleanPhone);
    
    if (success) {
      setCodeSent(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!phone || !verificationCode) return;
    
    const cleanPhone = getCleanPhone(phone);
    const success = await verifyCode(cleanPhone, verificationCode);
    
    if (success) {
      setIsVerified(true);
      onVerificationComplete?.(cleanPhone);
    }
  };

  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            WhatsApp Verificado
          </CardTitle>
          <CardDescription>
            Seu número {phone} foi verificado com sucesso!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Verificação WhatsApp
        </CardTitle>
        <CardDescription>
          {!codeSent 
            ? "Digite seu número do WhatsApp para receber um código de verificação"
            : "Digite o código de 6 dígitos enviado para seu WhatsApp"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!codeSent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Número do WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
              />
            </div>
            <Button 
              onClick={handleSendCode}
              disabled={!phone || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Código'
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Button 
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                }}
                className="w-full"
              >
                Alterar Número
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}