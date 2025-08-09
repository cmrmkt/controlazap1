import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

interface N8NHealthStatus {
  status: 'healthy' | 'warning' | 'error';
  last_sync: string;
  recent_transactions: number;
  recent_reminders: number;
  timestamp: string;
}

interface N8NMonitoringState {
  isConnected: boolean;
  lastSyncTime: Date | null;
  syncCount: number;
  healthStatus: N8NHealthStatus | null;
  errors: string[];
}

export function useN8NMonitoring() {
  const { user } = useAuth();
  const [state, setState] = useState<N8NMonitoringState>({
    isConnected: false,
    lastSyncTime: null,
    syncCount: 0,
    healthStatus: null,
    errors: []
  });

  // Track sync events
  useEffect(() => {
    const handleSyncEvent = (event: CustomEvent) => {
      console.log('[N8N-MONITOR] Sync event detected:', event.type);
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        lastSyncTime: new Date(),
        syncCount: prev.syncCount + 1,
        errors: [] // Clear errors on successful sync
      }));

      // Show success notification
      if (event.detail?.eventType === 'INSERT') {
        const eventTypeMap = {
          'transactions-updated': '💰 Transação',
          'reminders-updated': '⏰ Lembrete',
          'categories-updated': '📂 Categoria'
        };
        
        const eventName = eventTypeMap[event.type as keyof typeof eventTypeMap] || 'Dados';
        
        toast({
          title: `${eventName} sincronizado`,
          description: "Dados atualizados via WhatsApp/N8N",
          duration: 3000,
        });
      }
    };

    // Listen for N8N sync events
    const eventTypes = ['transactions-updated', 'reminders-updated', 'categories-updated'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSyncEvent as EventListener);
    });

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSyncEvent as EventListener);
      });
    };
  }, []);

  // Periodic health check
  useEffect(() => {
    if (!user) return;

    const checkHealth = async () => {
      try {
        console.log('[N8N-MONITOR] Checking health status...');
        
        const { data: healthData, error } = await supabase
          .rpc('check_n8n_health');
        
        if (error) {
          console.error('[N8N-MONITOR] Health check failed:', error);
          setState(prev => ({
            ...prev,
            healthStatus: null,
            errors: [...prev.errors, error.message].slice(-5) // Keep last 5 errors
          }));
          return;
        }

        console.log('[N8N-MONITOR] Health status:', healthData);
        
        const typedHealthData = healthData as unknown as N8NHealthStatus;
        
        setState(prev => ({
          ...prev,
          healthStatus: typedHealthData,
          isConnected: typedHealthData?.status !== 'error'
        }));

        // Show warning if sync issues detected
        if (typedHealthData?.status === 'warning') {
          toast({
            title: "⚠️ Aviso de Sincronização",
            description: "A sincronização N8N está com atraso. Verificando conexão...",
            variant: "destructive",
            duration: 5000,
          });
        } else if (typedHealthData?.status === 'error') {
          toast({
            title: "❌ Erro de Sincronização",
            description: "Problemas detectados na integração N8N/WhatsApp",
            variant: "destructive",
            duration: 8000,
          });
        }

      } catch (error) {
        console.error('[N8N-MONITOR] Health check exception:', error);
        setState(prev => ({
          ...prev,
          errors: [...prev.errors, `Health check failed: ${error}`].slice(-5)
        }));
      }
    };

    // Initial health check
    checkHealth();

    // Periodic health checks every 5 minutes
    const healthInterval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(healthInterval);
  }, [user]);

  // Connection timeout detection
  useEffect(() => {
    if (!state.lastSyncTime) return;

    const timeoutCheck = setInterval(() => {
      const now = new Date();
      const timeSinceLastSync = now.getTime() - state.lastSyncTime!.getTime();
      const timeoutThreshold = 10 * 60 * 1000; // 10 minutes

      if (timeSinceLastSync > timeoutThreshold && state.isConnected) {
        console.warn('[N8N-MONITOR] Sync timeout detected');
        setState(prev => ({
          ...prev,
          isConnected: false,
          errors: [...prev.errors, 'Sync timeout - no activity for 10+ minutes'].slice(-5)
        }));

        toast({
          title: "🔄 Timeout de Sincronização",
          description: "Nenhuma atividade N8N detectada nos últimos 10 minutos",
          variant: "destructive",
          duration: 6000,
        });
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => clearInterval(timeoutCheck);
  }, [state.lastSyncTime, state.isConnected]);

  // Manual health check function
  const checkHealthManually = async () => {
    try {
      console.log('[N8N-MONITOR] Manual health check requested...');
      
      const { data: healthData, error } = await supabase
        .rpc('check_n8n_health');
      
      if (error) {
        toast({
          title: "Erro no Health Check",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      const typedHealthData = healthData as unknown as N8NHealthStatus;
      
      toast({
        title: "✅ Health Check Concluído",
        description: `Status: ${typedHealthData.status}`,
      });

      return healthData;
    } catch (error) {
      console.error('[N8N-MONITOR] Manual health check failed:', error);
      toast({
        title: "Erro no Health Check",
        description: "Falha ao verificar status do N8N",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    ...state,
    checkHealthManually,
    isHealthy: state.healthStatus?.status === 'healthy',
    hasWarnings: state.healthStatus?.status === 'warning',
    hasErrors: state.healthStatus?.status === 'error' || state.errors.length > 0,
    lastSyncAgo: state.lastSyncTime 
      ? Math.floor((new Date().getTime() - state.lastSyncTime.getTime()) / 1000)
      : null
  };
}