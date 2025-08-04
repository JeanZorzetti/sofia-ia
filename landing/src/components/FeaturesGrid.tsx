import { Infinity, Brain, Target, Gem } from 'lucide-react';

const features = [
  {
    icon: Infinity,
    title: "Nunca Perde Um Lead",
    description: "Responde em 0.3s, 24/7. Enquanto concorrentes dormem, você vende. +67% de leads convertidos após 18h."
  },
  {
    icon: Brain,
    title: "Lê Mentes (Quase)",
    description: "Analisa 47 pontos de comportamento do cliente. Sabe se vai comprar antes mesmo dele decidir. 94% de precisão."
  },
  {
    icon: Target,
    title: "Só Fala Com Quem Compra",
    description: "Filtra curiosos automaticamente. Score de 0-100 em 3 perguntas. Seu tempo vale R$ 500/hora."
  },
  {
    icon: Gem,
    title: "Sua Sabedoria x10",
    description: "Copia seu jeito de vender + dados de 50.000 vendas. É você, mas sem limites físicos."
  }
];

const FeaturesGrid = () => {
  return (
    <section id="recursos" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={feature.title}
                className="group bg-card border border-subtle rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-card-hover hover:border-interactive gradient-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-6">
                  <IconComponent className="w-8 h-8 text-foreground group-hover:scale-110 transition-transform duration-300" />
                </div>
                
                <h3 className="text-xl font-light tracking-tight mb-4 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="font-light leading-relaxed text-slate-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;