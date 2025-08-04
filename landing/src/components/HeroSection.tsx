import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
const HeroSection = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {Array.from({
        length: 50
      }).map((_, i) => <div key={i} className="absolute w-1 h-1 bg-white rounded-full opacity-10 animate-float" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 6}s`,
        animationDuration: `${6 + Math.random() * 4}s`
      }} />)}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-ultra-light tracking-tight leading-tight mb-8">
            <span className="block animate-stagger-1">+340% de vendas.</span>
            <span className="block animate-stagger-2">Em 30 dias.</span>
            <span className="block animate-stagger-3">Comprovado.</span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl font-light max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in-up animation-delay-500 text-slate-300">
          A IA que vende apartamentos enquanto você dorme. 2.847 imobiliárias já faturam mais.
        </p>
        
        <div className="flex items-center justify-center space-x-4 mb-12 animate-fade-in-up animation-delay-600">
          <div className="bg-primary/20 border border-primary/30 rounded-full px-4 py-2">
            <span className="text-sm font-light text-primary">🔥 847 novos usuários essa semana</span>
          </div>
          <div className="bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
            <span className="text-sm font-light text-green-400">✅ Setup em 5 minutos</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-700">
          <Button size="lg" className="bg-primary text-primary-foreground hover:glow-primary rounded-full px-8 py-4 text-lg font-light tracking-wide transition-all duration-200 hover:scale-105">
            🚀 Triplicar vendas em 30 dias
          </Button>
          <Button variant="outline" size="lg" className="border-interactive hover:border-foreground text-foreground bg-transparent rounded-full px-8 py-4 text-lg font-light tracking-wide transition-all duration-200 hover:scale-105">
            📈 Ver case de R$ 2,3M/mês
          </Button>
        </div>
        
        <p className="text-sm font-light text-slate-400 mt-6 animate-fade-in-up animation-delay-800">
          ⏰ Últimas 3 vagas para consultoria gratuita este mês
        </p>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-fade-in-up animation-delay-1000">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-border-interactive to-transparent" />
            <ChevronDown className="w-5 h-5 text-tertiary animate-bounce" />
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;