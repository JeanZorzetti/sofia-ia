import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  MessageSquare, 
  Brain, 
  Sparkles, 
  Target,
  Clock,
  Heart,
  Zap
} from 'lucide-react';

const promptSuggestions = [
  {
    title: 'Vendedor Imobiliário Premium',
    description: 'Especialista em imóveis de alto padrão',
    prompt: 'Você é Sofia, uma corretora de imóveis especializada em propriedades premium. Seja consultiva, demonstre conhecimento técnico e foque na experiência de vida que o imóvel proporcionará.',
    icon: Target,
  },
  {
    title: 'Consultor Empático',
    description: 'Abordagem humanizada e próxima',
    prompt: 'Você é Sofia, uma consultora imobiliária que entende que comprar um imóvel é uma decisão emocional. Seja empática, ouça atentamente e conecte sonhos com realidade.',
    icon: Heart,
  },
  {
    title: 'Negociador Ágil',
    description: 'Focado em conversão rápida',
    prompt: 'Você é Sofia, uma negociadora experiente que identifica oportunidades rapidamente. Seja assertiva, crie urgência respeitosa e apresente soluções imediatas.',
    icon: Zap,
  },
];

const behaviorToggles = [
  { id: 'proactive', label: 'Proatividade', description: 'Fazer perguntas para qualificar leads' },
  { id: 'empathy', label: 'Empatia', description: 'Demonstrar compreensão emocional' },
  { id: 'urgency', label: 'Senso de Urgência', description: 'Criar escassez e oportunidade' },
  { id: 'technical', label: 'Conhecimento Técnico', description: 'Detalhar especificações técnicas' },
  { id: 'follow_up', label: 'Follow-up Automático', description: 'Acompanhar leads automaticamente' },
];

export const SDRConfigTab = () => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [behaviors, setBehaviors] = useState({
    proactive: true,
    empathy: true,
    urgency: false,
    technical: true,
    follow_up: true,
  });

  const handleBehaviorChange = (id: string, value: boolean) => {
    setBehaviors(prev => ({ ...prev, [id]: value }));
  };

  const applyPromptSuggestion = (prompt: string) => {
    setCurrentPrompt(prompt);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-foreground">Configuração SDR</h2>
        <p className="text-foreground-secondary">
          Personalize a personalidade e comportamento da Sofia IA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Prompt Builder */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
                <Brain className="h-5 w-5" />
                <span>Prompt Builder</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Descreva como Sofia deve se comportar, seu tom de voz, especialidades e abordagem de vendas..."
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="min-h-[200px] bg-background-secondary border-glass-border text-foreground font-light"
              />
              <div className="flex justify-between">
                <Badge variant="secondary" className="text-foreground-tertiary">
                  {currentPrompt.length} caracteres
                </Badge>
                <Button className="button-luxury" size="sm">
                  Salvar Prompt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Suggestions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
                <Sparkles className="h-5 w-5" />
                <span>Sugestões de Prompts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promptSuggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.title}
                      onClick={() => applyPromptSuggestion(suggestion.prompt)}
                      className="w-full p-4 text-left bg-background-secondary rounded-card border border-glass-border hover:bg-background-tertiary transition-all duration-300 hover-scale"
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <h4 className="font-light text-foreground tracking-wide-sofia">
                            {suggestion.title}
                          </h4>
                          <p className="text-sm text-foreground-secondary mt-1">
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Behavior Configuration */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
                <Bot className="h-5 w-5" />
                <span>Comportamentos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {behaviorToggles.map((toggle) => (
                  <div key={toggle.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-light text-foreground tracking-wide-sofia">
                        {toggle.label}
                      </h4>
                      <p className="text-sm text-foreground-secondary mt-1">
                        {toggle.description}
                      </p>
                    </div>
                    <Switch
                      checked={behaviors[toggle.id as keyof typeof behaviors]}
                      onCheckedChange={(value) => handleBehaviorChange(toggle.id, value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground font-light tracking-wider-sofia">
                <MessageSquare className="h-5 w-5" />
                <span>Preview da Sofia</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background-secondary rounded-card p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-light text-foreground">Sofia IA</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-200" />
                  </div>
                </div>
                <div className="bg-primary/10 rounded-card p-3">
                  <p className="text-foreground font-light">
                    Olá! Sou a Sofia, sua consultora imobiliária virtual. 
                    Estou aqui para ajudar você a encontrar o imóvel dos seus sonhos. 
                    Como posso ajudá-lo hoje?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};