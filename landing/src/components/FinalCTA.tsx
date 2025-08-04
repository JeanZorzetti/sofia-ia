import { Button } from '@/components/ui/button';
const FinalCTA = () => {
  return <section className="py-20 px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-cta" />
      
      {/* Rotating Particles */}
      <div className="absolute inset-0">
        {Array.from({
        length: 30
      }).map((_, i) => <div key={i} className="absolute w-1 h-1 bg-white rounded-full opacity-5 animate-float" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 6}s`,
        animationDuration: `${8 + Math.random() * 4}s`
      }} />)}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-ultra-light tracking-tight mb-6 text-foreground">
          Última chance: 76% OFF
        </h2>
        
        <p className="text-xl text-secondary font-light mb-8 max-w-2xl mx-auto leading-relaxed">
          847 imobiliárias pagaram preço cheio. Você não precisa.
        </p>

        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
          <div className="text-2xl font-light text-red-400 mb-2">⏰ Oferta expira em:</div>
          <div className="text-3xl font-ultra-light text-white">5 dias, 14 horas, 23 minutos</div>
          <div className="text-sm text-red-300 mt-2">Só para os próximos 50 cadastros</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
          <Button size="lg" className="bg-primary text-primary-foreground hover:glow-primary rounded-full px-8 py-4 text-lg font-light tracking-wide transition-all duration-200 hover:scale-105">
            🔥 Garantir 76% OFF agora
          </Button>
          <Button variant="outline" size="lg" className="border-interactive hover:border-foreground text-foreground bg-transparent rounded-full px-8 py-4 text-lg font-light tracking-wide transition-all duration-200 hover:scale-105">
            📊 Ver case de R$ 2,3M primeiro
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-sm text-green-400">✅ Setup em 5 min</div>
          </div>
          <div>
            <div className="text-sm text-green-400">✅ 60 dias garantia</div>
          </div>
          <div>
            <div className="text-sm text-green-400">✅ ROI ou dinheiro de volta</div>
          </div>
        </div>
      </div>
    </section>;
};
export default FinalCTA;