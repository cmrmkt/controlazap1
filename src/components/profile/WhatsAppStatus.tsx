import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MessageSquare } from 'lucide-react';

interface WhatsAppStatusProps {
  phone?: string;
}

export function WhatsAppStatus({ phone }: WhatsAppStatusProps) {

  if (!phone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Status WhatsApp
          </CardTitle>
          <CardDescription>
            Adicione um número de telefone para habilitar a integração WhatsApp
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
          Status WhatsApp
        </CardTitle>
        <CardDescription>
          Status da integração WhatsApp para {phone}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">
                WhatsApp Validado
              </p>
              <p className="text-sm text-muted-foreground">
                WhatsApp conectado e ativo
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ Seu WhatsApp está conectado e pronto para receber notificações da plataforma.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}