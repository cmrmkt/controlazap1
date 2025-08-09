// This hook is deprecated - use useGlobalRealtime instead
// Keeping for compatibility but redirecting to the centralized hook

import { useGlobalRealtime } from './useGlobalRealtime';

export function useRealtimeSync() {
  console.warn('[REALTIME] useRealtimeSync is deprecated, use useGlobalRealtime instead');
  return useGlobalRealtime();
}