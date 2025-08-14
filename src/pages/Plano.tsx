
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useTheme } from '@/hooks/useTheme';
import { Check } from 'lucide-react';

export default function Plano() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const handleSubscribe = () => {
    window.open('https://www.asaas.com/c/zgu2eq9l3g18gxib', '_blank');
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
    <div className="min-h-screen flex bg-background p-4 sm:p-6">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-3xl">
        <OptimizedImage 
          src="/lovable-uploads/a9a4f667-c2c7-4068-9052-4dd662fc919c.png?v=3" 
          alt="ControlaZap"
          className="w-full h-full object-cover"
          webp={false}
          lazy={false}
          skeleton={true}
          loading="eager"
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-8 left-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Agora ficou fácil!</h2>
          </div>
          <p className="text-base sm:text-lg opacity-90 mb-6">
            Gerencie suas finanças de forma simples e inteligente
          </p>
          
          {/* Seção de usuários */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-sm font-medium mb-3">
              Mais de 500 usuários já usam nossa plataforma
            </p>
            
            {/* Fotos dos usuários */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {userProfiles.map((profile, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/20"
                  >
                    <img 
                      src={profile} 
                      alt={`Usuário ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback para caso a imagem não carregue - Fixed XSS vulnerability
                        const target = e.target as HTMLImageElement;
                        target.style.backgroundColor = '#6366f1';
                        target.style.display = 'flex';
                        target.style.alignItems = 'center';
                        target.style.justifyContent = 'center';
                        target.style.color = 'white';
                        target.style.fontSize = '10px';
                        target.style.fontWeight = 'bold';
                        target.textContent = String.fromCharCode(65 + index);
                      }}
                    />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">+500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Plan Info */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex justify-end items-center">
          {/* Theme locked to dark mode */}
        </div>

        <div className="w-full max-w-md lg:max-w-lg mt-4 sm:mt-8 lg:mt-16 space-y-4">
          
          <div className="w-full mx-auto">
            <div className="text-start py-4 sm:py-6 lg:py-8">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 dark:text-slate-300">
                Plano Assistente Financeiro - <span className="text-primary">R$ 97,00/ano</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
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

              {/* Impact Message */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 mb-6 sm:mb-8 border border-green-200 dark:border-green-700">
                <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300 text-center">
                  💰 Apenas R$ 8,08 por mês!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 text-center mt-1">
                  <span className="line-through opacity-60">R$ 194,00/ano</span> - Economize <strong>R$ 97,00</strong> pagando anualmente! 🔥
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  ⚡ Menos que um cafezinho por dia - mais que um futuro próspero! ✨
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 sm:space-y-4">
                <Button 
                  onClick={handleSubscribe} 
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  🚀 Garantir meu plano agora - R$ 97,00
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
