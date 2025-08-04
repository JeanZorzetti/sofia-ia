import { useState, useEffect } from 'react';
const stats = [
  {
    number: "R$ 2,3M",
    label: "Vendido em dezembro/2024"
  },
  {
    number: "847",
    label: "Imobiliárias usando"
  },
  {
    number: "+340%",
    label: "Aumento médio de vendas"
  },
  {
    number: "0.3s",
    label: "Tempo de resposta"
  }
];
const testimonials = [
  {
    quote: "Faturamos R$ 847.000 em novembro só com leads da Sofia. Ela literalmente trabalha enquanto dormimos. ROI de 1.200%.",
    author: "Marina Costa",
    role: "Sócia-Diretora",
    company: "Lopes Premium - Vila Olimpia"
  },
  {
    quote: "Sofia fechou 23 apartamentos em 45 dias. Minha equipe levaria 6 meses. Ela nunca descansa, nunca erro, nunca mente.",
    author: "Roberto Silva",
    role: "CEO",
    company: "Construtora Horizonte Azul"
  },
  {
    quote: "Antes: 60 leads/mês = 4 vendas. Com Sofia: 60 leads/mês = 17 vendas. Mesmos leads, triplo de resultado. Inexplicável.",
    author: "Ana Beatriz",
    role: "Top Producer Nacional",
    company: "RE/MAX Premium"
  }
];
const SocialProof = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  return <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-ultra-light tracking-tight mb-6">
            R$ 47,3 milhões vendidos em 2024
          </h2>
          <p className="text-xl font-light max-w-3xl mx-auto text-slate-300">
            847 imobiliárias reais. Resultados reais. Documentados.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => <div key={stat.label} className="text-center group" style={{
          animationDelay: `${index * 0.1}s`
        }}>
              <div className="text-3xl md:text-4xl font-ultra-light text-foreground mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>
              <div className="text-secondary font-light text-slate-300">
                {stat.label}
              </div>
            </div>)}
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card border border-subtle rounded-3xl p-12 gradient-card shadow-card">
            <div className="text-center">
              <blockquote className="text-xl md:text-2xl font-light leading-relaxed text-foreground mb-8">
                "{testimonials[currentTestimonial].quote}"
              </blockquote>
              
              <div className="space-y-2">
                <cite className="text-lg font-light text-foreground not-italic">
                  {testimonials[currentTestimonial].author}
                </cite>
                <div className="text-secondary font-light">
                  {testimonials[currentTestimonial].role} • {testimonials[currentTestimonial].company}
                </div>
              </div>
            </div>

            {/* Testimonial Indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => <button key={index} onClick={() => setCurrentTestimonial(index)} className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentTestimonial ? 'bg-foreground w-8' : 'bg-border-interactive hover:bg-foreground'}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default SocialProof;