const Footer = () => {
  const currentYear = new Date().getFullYear();
  return <footer id="contato" className="py-16 px-6 border-t border-subtle">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-ultra-light tracking-wide text-foreground mb-4">
              SOFIA IA
            </h3>
            <p className="font-light leading-relaxed max-w-md text-slate-300">
              A sabedoria que transforma conversas em vendas. Cada palavra importa.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-foreground font-light mb-4">Produto</h4>
            <ul className="space-y-3">
              <li className="bg-slate-300/0">
                <a href="#recursos" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#precos" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Preços
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Integrações
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  API
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-foreground font-light mb-4">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Contato
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Carreiras
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary hover:text-foreground transition-colors duration-200 font-light">
                  Parceiros
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-subtle">
          <div className="text-tertiary font-light text-sm mb-4 md:mb-0">
            © {currentYear} SOFIA IA. A sabedoria que transforma conversas em vendas.
          </div>
          
          <div className="flex space-x-6">
            <a href="#" className="text-tertiary hover:text-secondary transition-colors duration-200 font-light text-sm">
              Termos de Uso
            </a>
            <a href="#" className="text-tertiary hover:text-secondary transition-colors duration-200 font-light text-sm">
              Privacidade
            </a>
            <a href="#" className="text-tertiary hover:text-secondary transition-colors duration-200 font-light text-sm">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;