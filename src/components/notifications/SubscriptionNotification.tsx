import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';

export function SubscriptionNotification() {
  const { user } = useAuth();
  const { subscription, syncSubscription } = useSubscription();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'warning' | 'info'>('info');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || !subscription) return;

    // Check subscription status and show appropriate notifications
    if (subscription.status === 'inactive' || subscription.status === 'canceled') {
      setNotificationType('warning');
      setMessage('Sua assinatura está inativa. Renove para continuar usando todos os recursos.');
      setShowNotification(true);
    } else if (subscription.status === 'active') {
      // Check if payment is due soon (next_payment_date logic would go here)
      setNotificationType('success');
      setMessage('Sua assinatura está ativa e em dia!');
      
      // Auto-hide success notifications after 5 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user, subscription]);

  const handleSync = async () => {
    await syncSubscription();
    setShowNotification(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) return null;

  const getIcon = () => {
    switch (notificationType) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (notificationType) {
      case 'warning':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {getIcon()}
          <AlertDescription>{message}</AlertDescription>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {notificationType === 'warning' && (
            <Button size="sm" variant="outline" onClick={handleSync}>
              Sincronizar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}