import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { PaletteProvider } from "@/contexts/PaletteContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Suspense, lazy } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime";

// Critical pages loaded immediately for instant access
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Perfil from "./pages/Perfil";
import Plano from "./pages/Plano";

// Less critical pages lazy loaded
const Transacoes = lazy(() => import("./pages/Transacoes"));
const Lembretes = lazy(() => import("./pages/Lembretes"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const NotFound = lazy(() => import("./pages/NotFound"));

// QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && 'status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0, // No retries for mutations
    }
  }
});

function ProtectedRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout><Outlet /></AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  // Initialize global realtime sync for authenticated users
  useGlobalRealtime();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if we're in password recovery mode
  const isPasswordRecovery = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    return urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
  };

  return (
    <Routes>
      <Route path="/auth" element={user && !isPasswordRecovery() ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/plano" element={<Plano />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transacoes" element={
          <Suspense fallback={<div className="p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <Transacoes />
          </Suspense>
        } />
        <Route path="/categorias" element={
          <Suspense fallback={<div className="p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <Categorias />
          </Suspense>
        } />
        <Route path="/relatorios" element={
          <Suspense fallback={<div className="p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <Relatorios />
          </Suspense>
        } />
        <Route path="/lembretes" element={
          <Suspense fallback={<div className="p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <Lembretes />
          </Suspense>
        } />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/whatsapp" element={
          <Suspense fallback={<div className="p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <WhatsApp />
          </Suspense>
        } />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="financeflow-theme">
          <PaletteProvider>
            <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
            </AuthProvider>
          </PaletteProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
