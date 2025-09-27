
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProtectedVideo } from '@/components/ui/protected-video';
import { useTheme } from '@/hooks/useTheme';
import { Check } from 'lucide-react';


export default function Plano() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const handleSubscribeAnnual = () => {
    window.open('https://pay.kiwify.com.br/KOD32qJ', '_blank');
  };
  
  const handleSubscribeMonthly = () => {
    window.open('https://pay.kiwify.com.br/m4Dm7Lr', '_blank');
  };
  
  const handleBackToLogin = () => {
    navigate('/auth');
  };
  
  const benefits = [
    'Registre gastos e receitas automaticamente',
    'Receba lembretes de contas e metas', 
    'Tenha um assistente sempre pronto para ajudar'
  ];

  // Array de fotos de usuários para simular perfis
  const userProfiles = [
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1441057206919-63d19fac2369?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=100&h=100&fit=crop&crop=face'
  ];

  return (
    <div className="min-h-screen bg-background flex justify-center">
      {/* Video Section - Top of page for all devices */}
      <div className="w-full p-4 pb-0">
        <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-lg">
          <div className="h-[70vh] min-h-[300px] max-h-[500px] sm:max-h-[400px] lg:max-h-[450px] rounded-xl overflow-hidden">
            <ProtectedVideo
              src="/videos/controlazap-video.mp4"
              className="w-full h-full"
              autoplay={false}
              muted={true}
            />
          </div>
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white text-center">
              <p className="text-xs font-medium">Veja como é fácil usar o ControlaZap!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Below video for all devices */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md lg:max-w-lg space-y-4">
          <div className="w-full mx-auto">
            <div className="text-center py-4 sm:py-6 lg:py-8">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-4 dark:text-slate-300">
                Plano Assistente Financeiro
              </h1>
              
              {/* Pricing Options */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base sm:text-lg font-semibold text-primary">Plano anual - R$ 99,90</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base sm:text-lg font-semibold text-primary">Plano mensal - R$ 14,90</span>
                </div>
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8">
                🚀 <strong>Controle total das suas finanças</strong> com a inteligência artificial mais avançada do mercado!
              </p>

              {/* Benefits List */}
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-primary rounded-full p-1 mt-0.5 flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-foreground font-medium">{benefit}</p>
                  </div>
                ))}
              </div>

              {/* Enhanced Benefits */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-6 sm:mb-8 border border-primary/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm font-medium text-foreground">✨ Categorização automática inteligente</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm font-medium text-foreground">📊 Relatórios detalhados em PDF</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <p className="text-sm font-medium text-foreground">📱 Lembretes via WhatsApp</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 sm:space-y-4">
                <Button 
                  onClick={handleSubscribeAnnual} 
                  className="w-full h-16 sm:h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-sm sm:text-base lg:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-center justify-center leading-tight"
                >
                  <span className="sm:hidden">🚀 Quero o Plano Anual</span>
                  <span className="sm:hidden">R$ 99,90</span>
                  <span className="hidden sm:inline">🚀 Quero o Plano Anual - R$ 99,90</span>
                </Button>
                
                <Button 
                  onClick={handleSubscribeMonthly}
                  variant="outline"
                  className="w-full h-16 sm:h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-sm sm:text-base lg:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-center justify-center leading-tight"
                >
                  <span className="sm:hidden">🚀 Quero o Plano Mensal</span>
                  <span className="sm:hidden">R$ 14,90</span>
                  <span className="hidden sm:inline">🚀 Quero o Plano Mensal - R$ 14,90</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleBackToLogin} 
                  className="w-full h-11 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-base sm:text-lg"
                >
                  Voltar ao login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
