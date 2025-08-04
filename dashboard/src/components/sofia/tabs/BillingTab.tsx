import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Check, 
  Zap, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  CreditCard,
  Calendar,
  Download,
  Star
} from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'STARTER',
    price: 'R$ 67',
    period: '/mês',
    description: 'Ideal para corretores individuais',
    features: [
      '15.000 tokens Claude 3.5',
      '1 WhatsApp conectado',
      'Templates básicos',
      'Suporte via email',
      'Dashboard básico',
    ],
    badge: null,
    buttonText: 'Começar Agora',
    popular: false,
  },
  {
    id: 'professional',
    name: 'PROFESSIONAL',
    price: 'R$ 97',
    period: '/mês',
    description: 'Para equipes pequenas e médias',
    features: [
      '50.000 tokens Claude 3.5',
      '3 WhatsApps conectados',
      'CRM integrado',
      'IA treinada personalizada',
      'Templates premium',
      'Analytics avançadas',
      'Suporte prioritário',
    ],
    badge: 'MAIS POPULAR',
    buttonText: 'Fazer Upgrade',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: 'R$ 297',
    period: '/mês',
    description: 'Para empresas e imobiliárias',
    features: [
      'Tokens ilimitados',
      'WhatsApps ilimitados',
      'Multi-unidades + API',
      'Gerente de sucesso',
      'Customização completa',
      'Integração personalizada',
      'SLA garantido',
      'Treinamento dedicado',
    ],
    badge: 'ENTERPRISE',
    buttonText: 'Falar com Vendas',
    popular: false,
  },
];

const billingHistory = [
  { date: '2024-01-15', plan: 'Professional', amount: 'R$ 97,00', status: 'Pago' },
  { date: '2023-12-15', plan: 'Professional', amount: 'R$ 97,00', status: 'Pago' },
  { date: '2023-11-15', plan: 'Starter', amount: 'R$ 67,00', status: 'Pago' },
  { date: '2023-10-15', plan: 'Starter', amount: 'R$ 67,00', status: 'Pago' },
];

export const BillingTab = () => {
  const [currentPlan] = useState('professional');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const tokensUsed = 32450;
  const tokensLimit = 50000;
  const tokenPercentage = (tokensUsed / tokensLimit) * 100;

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setShowCheckout(true);
  };

  const CheckoutModal = () => {
    if (!showCheckout || !selectedPlan) return null;

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-foreground font-light tracking-wider-sofia text-center">
              Finalizar Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-extralight text-foreground">
                {plan.name}
              </h3>
              <div className="text-3xl font-light text-foreground">
                {plan.price}<span className="text-lg text-foreground-secondary">{plan.period}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-background-secondary rounded-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-foreground-secondary">Subtotal</span>
                  <span className="text-foreground">{plan.price}</span>
                </div>
                <div className="flex justify-between items-center border-t border-glass-border pt-2">
                  <span className="font-light text-foreground">Total</span>
                  <span className="font-light text-foreground">{plan.price}/mês</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full button-luxury" 
                  onClick={() => {
                    // Aqui integraria com Stripe
                    window.open('https://buy.stripe.com/test_payment_link', '_blank');
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar com Cartão
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowCheckout(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-foreground">Billing & Planos</h2>
          <p className="text-foreground-secondary">
            Gerencie sua assinatura e acompanhe o uso de tokens
          </p>
        </div>

        {/* Current Usage */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
              <Zap className="h-5 w-5" />
              <span>Uso Atual</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-foreground-secondary">Tokens Utilizados</span>
                  <span className="text-foreground font-light">
                    {tokensUsed.toLocaleString()}/{tokensLimit.toLocaleString()}
                  </span>
                </div>
                <Progress value={tokenPercentage} className="h-2 bg-background-tertiary" />
                <div className="text-sm text-foreground-tertiary">
                  {(100 - tokenPercentage).toFixed(1)}% disponível
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-foreground-secondary">Plano Atual</span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-primary text-primary-foreground">PROFESSIONAL</Badge>
                  <Star className="h-4 w-4 text-yellow-400" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-foreground-secondary">Próxima Cobrança</span>
                <div className="text-foreground font-light">15 Fev 2024</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="space-y-6">
          <h3 className="text-2xl font-extralight text-foreground tracking-wider-sofia text-center">
            Escolha Seu Plano
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`
                  glass-card hover-scale cursor-pointer relative
                  ${plan.popular ? 'ring-2 ring-primary' : ''}
                  ${currentPlan === plan.id ? 'ring-2 ring-green-500' : ''}
                `}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center space-y-4">
                  <div>
                    <h3 className="text-xl font-light text-foreground tracking-widest-sofia">
                      {plan.name}
                    </h3>
                    <p className="text-foreground-secondary text-sm mt-1">
                      {plan.description}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-4xl font-extralight text-foreground">
                      {plan.price}
                      <span className="text-lg text-foreground-secondary">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-foreground-secondary text-sm font-light">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`
                      w-full transition-all duration-300
                      ${currentPlan === plan.id 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'button-luxury'
                      }
                    `}
                    onClick={() => currentPlan !== plan.id && handlePlanSelect(plan.id)}
                    disabled={currentPlan === plan.id}
                  >
                    {currentPlan === plan.id ? 'Plano Atual' : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
                <Calendar className="h-5 w-5" />
                <span>Histórico de Pagamentos</span>
              </span>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-background-secondary rounded-card"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <div className="text-foreground font-light">{item.plan}</div>
                      <div className="text-foreground-tertiary text-sm">{item.date}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-foreground font-light">{item.amount}</div>
                    <Badge variant="secondary" className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CheckoutModal />
    </>
  );
};