import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Sofia AI',
  description: 'Política de privacidade do Sofia AI. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/privacidade' },
}

const sections = [
  {
    title: '1. Controlador dos Dados',
    content: 'A ROI Labs, desenvolvedora do Sofia AI, é a controladora dos seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Para questões relacionadas à privacidade, entre em contato em contato@roilabs.com.br.',
  },
  {
    title: '2. Dados que Coletamos',
    content: 'Coletamos: (a) Dados de cadastro: nome, email e senha (criptografada); (b) Dados de uso: orquestrações criadas, agentes configurados, documentos enviados à Knowledge Base; (c) Dados de pagamento: processados diretamente pelo Mercado Pago — não armazenamos dados de cartão; (d) Dados técnicos: logs de acesso, endereço IP, tipo de browser, para fins de segurança e diagnóstico.',
  },
  {
    title: '3. Como Usamos seus Dados',
    content: 'Usamos seus dados para: prestação do serviço; comunicação sobre sua conta; melhoria da plataforma; cumprimento de obrigações legais; prevenção de fraudes. Não vendemos seus dados para terceiros.',
  },
  {
    title: '4. Base Legal (LGPD)',
    content: 'Processamos seus dados com base em: (a) Execução de contrato — para fornecer o serviço contratado; (b) Interesse legítimo — para segurança e melhoria da plataforma; (c) Consentimento — para comunicações de marketing (você pode revogar a qualquer momento); (d) Obrigação legal — quando exigido por lei.',
  },
  {
    title: '5. Compartilhamento de Dados',
    content: 'Compartilhamos dados apenas com: provedores de infraestrutura (Vercel, para hospedagem); Mercado Pago (processamento de pagamentos); Resend (envio de emails transacionais); Groq/OpenAI/Anthropic (processamento de IA — apenas o conteúdo enviado nas requisições). Todos os fornecedores estão sujeitos a obrigações de confidencialidade.',
  },
  {
    title: '6. Retenção de Dados',
    content: 'Mantemos seus dados pelo período necessário para a prestação do serviço. Após o cancelamento da conta, excluímos seus dados em até 90 dias, exceto quando a retenção for exigida por lei (como registros fiscais, que podem ser mantidos por até 5 anos).',
  },
  {
    title: '7. Segurança',
    content: 'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo: conexões HTTPS/TLS; senhas com hash bcrypt; isolamento de dados por tenant; backups automáticos criptografados; controles de acesso baseados em função.',
  },
  {
    title: '8. Seus Direitos (LGPD)',
    content: 'Você tem o direito de: acessar seus dados pessoais; corrigir dados incorretos; solicitar a exclusão dos seus dados; revogar consentimentos; obter portabilidade dos dados; opor-se ao processamento. Para exercer esses direitos, entre em contato em contato@roilabs.com.br.',
  },
  {
    title: '9. Cookies',
    content: 'Usamos cookies essenciais para autenticação e funcionamento da plataforma (NextAuth). Não usamos cookies de rastreamento de terceiros para publicidade. Você pode controlar cookies nas configurações do seu browser, mas isso pode afetar o funcionamento da plataforma.',
  },
  {
    title: '10. Transferência Internacional',
    content: 'Alguns dados podem ser processados em servidores fora do Brasil (Vercel — EUA; Groq — EUA; OpenAI — EUA). Essas transferências ocorrem com as salvaguardas adequadas, incluindo cláusulas contratuais padrão e conformidade com regulamentos aplicáveis.',
  },
  {
    title: '11. Menores de Idade',
    content: 'O Sofia AI não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor, excluiremos essas informações imediatamente.',
  },
  {
    title: '12. Alterações nesta Política',
    content: 'Podemos atualizar esta política periodicamente. Notificaremos por email ou aviso na plataforma sobre mudanças significativas. O uso continuado após as alterações constitui aceitação da nova política.',
  },
]

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="https://sofiaia.roilabs.com.br/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-4xl font-bold mb-2">Política de Privacidade</h1>
          <p className="text-foreground-tertiary text-sm mb-10">Última atualização: Fevereiro de 2026 — Em conformidade com a LGPD</p>

          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
                <p className="text-foreground-secondary leading-relaxed text-sm">{section.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-5 glass-card rounded-xl border border-white/10">
            <p className="text-sm text-foreground-tertiary">
              Dúvidas sobre privacidade?{' '}
              <Link href="/contato" className="text-blue-400 hover:text-blue-300 transition-colors">Entre em contato</Link>
              {' '}ou leia nossos{' '}
              <Link href="/termos" className="text-blue-400 hover:text-blue-300 transition-colors">Termos de Uso</Link>.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
        </p>
      </footer>
    </div>
  )
}
