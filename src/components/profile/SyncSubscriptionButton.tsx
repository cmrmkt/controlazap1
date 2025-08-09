import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface SyncSubscriptionButtonProps {
  onSyncComplete?: () => void;
}

export function SyncSubscriptionButton({ onSyncComplete }: SyncSubscriptionButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('[SyncButton] Starting manual subscription sync');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const response = await supabase.functions.invoke('sync-subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('[SyncButton] Sync response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Erro na sincronização');
      }

      toast({
        title: "Sucesso",
        description: response.data?.message || "Assinatura sincronizada com sucesso",
      });

      // Call callback to refresh parent component data
      if (onSyncComplete) {
        onSyncComplete();
      }

    } catch (error: any) {
      console.error('[SyncButton] Error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar assinatura",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Sincronizando...' : 'Sincronizar Plano'}
    </Button>
  );
}