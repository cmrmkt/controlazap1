import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Centralized realtime hook to prevent duplications and improve performance
export function useGlobalRealtime() {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const lastUpdateRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    console.log('[GLOBAL-REALTIME] Setting up centralized realtime for user:', user.id);

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Debounce function to prevent duplicate events - aumentado para 1500ms
    const debounceEvent = (eventType: string, callback: () => void, delay = 1500) => {
      const now = Date.now();
      const key = `${eventType}-${user.id}`;
      
      if (lastUpdateRef.current[key] && now - lastUpdateRef.current[key] < delay) {
        console.log(`[GLOBAL-REALTIME] Debouncing ${eventType} - too recent`);
        return;
      }
      
      lastUpdateRef.current[key] = now;
      callback();
    };

    // Single unified channel for all user data
    const globalChannel = supabase
      .channel(`global-realtime-${user.id}`, {
        config: {
          broadcast: { self: false }, // Don't echo our own changes
          presence: { key: user.id }
        }
      })
      // Profile changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('profile', () => {
            console.log('[GLOBAL-REALTIME] Profile updated:', payload);
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'profile', payload } }));
          });
        }
      )
      // Subscription changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('subscription', () => {
            console.log('[GLOBAL-REALTIME] Subscription updated:', payload);
            window.dispatchEvent(new CustomEvent('subscription-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'subscription', payload } }));
          });
        }
      )
      // Transaction changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes',
          filter: `userid=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('transactions', () => {
            console.log('[GLOBAL-REALTIME] Transaction updated:', payload);
            window.dispatchEvent(new CustomEvent('transactions-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'transaction', payload } }));
          });
        }
      )
      // Reminder changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lembretes',
          filter: `userid=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('reminders', () => {
            console.log('[GLOBAL-REALTIME] Reminder updated:', payload);
            window.dispatchEvent(new CustomEvent('reminders-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'reminder', payload } }));
          });
        }
      )
      // Category changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categorias',
          filter: `userid=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('categories', () => {
            console.log('[GLOBAL-REALTIME] Category updated:', payload);
            window.dispatchEvent(new CustomEvent('categories-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'category', payload } }));
          });
        }
      )
      // Goals changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          debounceEvent('goals', () => {
            console.log('[GLOBAL-REALTIME] Goals updated:', payload);
            window.dispatchEvent(new CustomEvent('goals-updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { type: 'goal', payload } }));
          });
        }
      )
      .subscribe((status) => {
        console.log('[GLOBAL-REALTIME] Connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[GLOBAL-REALTIME] Successfully connected to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[GLOBAL-REALTIME] Channel error, attempting reconnect...');
          setTimeout(() => {
            globalChannel.subscribe();
          }, 2000);
        } else if (status === 'TIMED_OUT') {
          console.error('[GLOBAL-REALTIME] Connection timed out, retrying...');
          setTimeout(() => {
            globalChannel.subscribe();
          }, 5000);
        }
      });

    channelRef.current = globalChannel;

    return () => {
      console.log('[GLOBAL-REALTIME] Cleaning up global realtime connection');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Clear debounce cache
      lastUpdateRef.current = {};
    };
  }, [user]);

  return {
    isConnected: !!channelRef.current,
    reconnect: () => {
      if (channelRef.current) {
        channelRef.current.subscribe();
      }
    }
  };
}