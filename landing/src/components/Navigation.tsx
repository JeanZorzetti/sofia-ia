import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-blur-premium py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-ultra-light tracking-wide text-foreground">
            SOFIA IA
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <a 
            href="#produto" 
            className="text-secondary hover:text-foreground transition-colors duration-200 font-light"
          >
            Produto
          </a>
          <a 
            href="#recursos" 
            className="text-secondary hover:text-foreground transition-colors duration-200 font-light"
          >
            Recursos
          </a>
          <a 
            href="#precos" 
            className="text-secondary hover:text-foreground transition-colors duration-200 font-light"
          >
            Preços
          </a>
          <a 
            href="#contato" 
            className="text-secondary hover:text-foreground transition-colors duration-200 font-light"
          >
            Contato
          </a>
        </div>

        {/* CTAs */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            className="hidden sm:inline-flex text-secondary hover:text-foreground border-interactive hover:border-foreground transition-all duration-200"
          >
            Entrar
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:glow-primary rounded-full px-6 font-light tracking-wide transition-all duration-200 hover:scale-105"
          >
            Começar grátis
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;