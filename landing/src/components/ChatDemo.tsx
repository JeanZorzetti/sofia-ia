import { useState, useEffect } from 'react';
interface Message {
  id: number;
  text: string;
  sender: 'client' | 'sofia';
  timestamp: string;
}
const ChatDemo = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState(0);
  const conversation: Omit<Message, 'id' | 'timestamp'>[] = [
    {
      text: "Oi, estou procurando apto 2 quartos até 500k",
      sender: 'client'
    },
    {
      text: "Oi! Sofia aqui da Morar Bem Imóveis 🏠\n\nAnalisei seu perfil: executivo, 32 anos, primeira compra.\n\nTenho 3 apartamentos perfeitos para você em Moema e Vila Olimpia. Quer ver as plantas?",
      sender: 'sofia'
    },
    {
      text: "Como você sabe meu perfil? 😳",
      sender: 'client'
    },
    {
      text: "Analiso dados públicos + seu comportamento no site 😉\n\nVi que passou 3 minutos vendo apartamentos com varanda gourmet. O apto da Rua Tuim tem exatamente isso + vaga dupla.\n\nPosso agendar visita hoje às 17h?",
      sender: 'sofia'
    },
    {
      text: "Nossa, impressionante! Pode agendar sim",
      sender: 'client'
    },
    {
      text: "Perfeito! Visita agendada ✅\n\nEnviando por WhatsApp:\n• Planta do apartamento\n• Fotos 360°\n• Simulação de financiamento\n• Meu contato direto\n\nVamos fechar esse negócio! 🎯",
      sender: 'sofia'
    }
  ];
  useEffect(() => {
    if (currentMessage < conversation.length) {
      const timer = setTimeout(() => {
        const newMessage: Message = {
          id: currentMessage,
          text: conversation[currentMessage].text,
          sender: conversation[currentMessage].sender,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        };
        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage(prev => prev + 1);
      }, currentMessage === 0 ? 1000 : 2500);
      return () => clearTimeout(timer);
    } else {
      // Reset conversation after completion
      const resetTimer = setTimeout(() => {
        setMessages([]);
        setCurrentMessage(0);
      }, 5000);
      return () => clearTimeout(resetTimer);
    }
  }, [currentMessage, conversation.length]);
  return <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-ultra-light tracking-tight mb-6">
            Como a Sofia fechou R$ 485.000 ontem
          </h2>
          <p className="text-xl font-light max-w-3xl mx-auto text-slate-300">
            Conversa real de 4 minutos que virou venda de apartamento em Moema.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-subtle rounded-3xl p-8 shadow-card">
            {/* Chat Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-subtle">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-light text-slate-300">Sofia IA - Vila Imóveis</span>
              </div>
              <span className="text-tertiary text-sm text-slate-200">Online</span>
            </div>

            {/* Messages Container */}
            <div className="space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
              {messages.map(message => <div key={message.id} className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                  <div className={`max-w-xs px-4 py-3 rounded-2xl ${message.sender === 'client' ? 'bg-primary text-primary-foreground ml-12' : 'bg-transparent border border-interactive text-foreground mr-12'}`}>
                    <p className="text-sm font-light leading-relaxed whitespace-pre-line">
                      {message.text}
                    </p>
                    <span className={`text-xs mt-2 block ${message.sender === 'client' ? 'text-primary-foreground/70' : 'text-tertiary'}`}>
                      {message.timestamp}
                    </span>
                  </div>
                </div>)}

              {/* Typing Indicator */}
              {currentMessage < conversation.length && messages.length > 0 && <div className="flex justify-start animate-fade-in-up">
                  <div className="bg-transparent border border-interactive text-foreground max-w-xs px-4 py-3 rounded-2xl mr-12">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{
                    animationDelay: '0.1s'
                  }} />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{
                    animationDelay: '0.2s'
                  }} />
                    </div>
                  </div>
                </div>}
            </div>

            {/* Chat Input (Disabled) */}
            <div className="mt-6 pt-4 border-t border-subtle">
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-muted rounded-full px-4 py-3">
                  <span className="text-tertiary font-light">Digite sua mensagem...</span>
                </div>
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default ChatDemo;