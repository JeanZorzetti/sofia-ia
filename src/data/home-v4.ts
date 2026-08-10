import {
  Repeat2,
  Construction,
  EyeOff,
  ClipboardList,
  Code2,
  ShieldCheck,
  Rocket,
  Search,
  Gauge,
  Palette,
  GitBranch,
  Globe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FAQItem } from '@/components/landing/FAQSection'

export interface CtaLink {
  label: string
  href: string
}

export interface HeroCopy {
  h1: string
  sub: string
  ctaPrimary: CtaLink
  ctaSecondary: CtaLink
}

export const heroCopy: HeroCopy = {
  h1: 'Sites de produção, não protótipos.',
  sub: 'Um time de agentes de IA — desenvolvedor, revisor e líder técnico — constrói seu site, revisa cada mudança e publica no seu domínio. Código seu, em git, desde o primeiro commit.',
  ctaPrimary: { label: 'Peça seu site — brief de 5 minutos', href: '/peca-seu-site' },
  ctaSecondary: { label: 'Ver um site que saiu daqui', href: 'https://estetia.estetiacrm.com.br' },
}

export interface IconCard {
  icon: LucideIcon
  title: string
  description: string
}

export const painCards: IconCard[] = [
  {
    icon: Repeat2,
    title: 'O loop que queima crédito',
    description:
      'Builder de IA conserta um bug e quebra outro — e cobra por cada tentativa de conserto. Aqui o custo do retrabalho é nosso, não seu.',
  },
  {
    icon: Construction,
    title: 'O protótipo que trava nos 70%',
    description:
      'A maioria das ferramentas de IA entrega até ~70% do caminho; os 30% finais viram semanas de ajuste manual. Entregamos os 100%: repositório git + site em produção.',
  },
  {
    icon: EyeOff,
    title: 'O site que o Google não vê',
    description:
      'App builders geram SPA client-side — o Googlebot recebe um HTML quase vazio. Seu site sai SSR/SSG, indexável desde o primeiro deploy.',
  },
]

export const howItWorksSteps: IconCard[] = [
  {
    icon: ClipboardList,
    title: 'Brief',
    description: 'Você conta o que precisa: tipo de site, objetivo, referências. 5 minutos.',
  },
  {
    icon: Code2,
    title: 'Time constrói',
    description: 'Agentes desenvolvedores implementam cada parte do site, task a task, em um repositório git real.',
  },
  {
    icon: ShieldCheck,
    title: 'Revisor aprova',
    description: 'Um agente revisor julga cada diff antes de aceitar — quem escreve não é quem aprova.',
  },
  {
    icon: Rocket,
    title: 'Deploy no seu domínio',
    description: 'Site em produção, HTML real, SEO técnico de fábrica. O repositório é seu desde o primeiro commit.',
  },
]

export interface ComparisonRow {
  critique: string
  response: string
  source: { label: string; url: string }
}

export const comparisonRows: ComparisonRow[] = [
  {
    critique:
      'Créditos queimados a cada bug corrigido é apontado como a queixa nº1 nas avaliações públicas de builders de IA como o Lovable.',
    response: 'Preço fechado por entrega. Corrigir o que quebrou é custo nosso, não uma cobrança nova.',
    source: { label: 'eesel.ai — guia de preços do Lovable', url: 'https://www.eesel.ai/blog/lovable-pricing' },
  },
  {
    critique:
      'Análises independentes descrevem builders de IA como capazes de levar "no máximo 70% do caminho" até produção real.',
    response: 'Entrega = repositório git completo + site em produção no seu domínio. Sem os 30% finais pra você resolver sozinho.',
    source: { label: 'Superblocks — review do Lovable', url: 'https://www.superblocks.com/blog/lovable-dev-review' },
  },
  {
    critique:
      'Uma falha de autenticação permitiu acesso não autorizado a apps privados de outra plataforma de vibe coding usando só um ID público na URL.',
    response: 'Seu site não roda "dentro" de plataforma nenhuma: é estático/SSR próprio, sem backend compartilhado exposto a outros clientes.',
    source: { label: 'Wiz Research — vulnerabilidade crítica no Base44', url: 'https://www.wiz.io/blog/critical-vulnerability-base44' },
  },
  {
    critique:
      'Uma apuração de imprensa documentou mais de 170 apps de outro builder de IA expostos por falta de Row Level Security no banco.',
    response: 'Mesma resposta estrutural: sem banco compartilhado multi-tenant por trás do site entregue.',
    source: { label: 'The Register — apps expostos', url: 'https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities/' },
  },
  {
    critique:
      'Apps gerados por builders de IA costumam sair como SPA client-side; crawlers recebem HTML quase vazio até um serviço de terceiro re-renderizar.',
    response: 'Sites saem SSR/SSG com HTML real, sitemap e schema.org — sem depender de serviço externo pro Google enxergar.',
    source: { label: 'Prerender.io — guia de SEO para sites Lovable', url: 'https://prerender.io/blog/how-to-make-lovable-websites-seo-friendly/' },
  },
  {
    critique: 'Exportar o código de um builder de IA depende de um fluxo indireto via GitHub, terceiro obrigatório no processo.',
    response: 'O repositório é seu desde o primeiro commit — sem passo de exportação, sem terceiro no meio.',
    source: {
      label: 'Rapid Dev — como exportar código do Lovable',
      url: 'https://www.rapidevelopers.com/blog/can-i-export-lovable-step-by-step-guide-to-getting-your-code-out',
    },
  },
]

export const includedItems: IconCard[] = [
  {
    icon: Search,
    title: 'SEO técnico + GEO/AEO',
    description: 'Sitemap, schema.org e otimização para respostas de IA (ChatGPT, Perplexity, Gemini) — o playbook GEO/AEO da ROI Labs aplicado ao seu site.',
  },
  {
    icon: Gauge,
    title: 'Performance',
    description: 'Core Web Vitals medidos, não prometidos. SSR/SSG por padrão, sem shell vazio.',
  },
  {
    icon: Palette,
    title: 'Design system próprio',
    description: 'Identidade visual pensada pro seu projeto, não um template genérico reaproveitado.',
  },
  {
    icon: GitBranch,
    title: 'Repositório seu',
    description: 'Git desde o primeiro commit. Cancele quando quiser e leve tudo.',
  },
  {
    icon: Globe,
    title: 'Deploy no seu domínio',
    description: 'Site em produção no seu domínio, sem marca d’água, sem subdomínio de terceiro.',
  },
]

export interface PricingModel {
  title: string
  bullets: string[]
  cta: CtaLink
}

export const pricingModel: PricingModel = {
  title: 'Preço fechado por entrega',
  bullets: [
    'Você sabe o valor antes de começar — sem créditos, sem cobrança por tentativa.',
    'Manutenção e evolução: assinatura mensal opcional, sob demanda.',
    'Sem créditos, sem API paga: o motor roda na capacidade da ROI Labs.',
  ],
  cta: { label: 'Peça seu orçamento', href: '/peca-seu-site' },
}

export const proofCopy = {
  caseTitle: 'Estetia CRM',
  caseDescription: 'Landing B2B no ar, feita pelo mesmo motor que constrói o seu site.',
  caseHref: 'https://estetia.estetiacrm.com.br',
  dogfooding: 'A própria Polaris é desenvolvida pelo motor que constrói o seu site.',
}

export const intakeFaq: FAQItem[] = [
  {
    question: 'E se eu quiser sair depois?',
    answer: 'O repositório é seu desde o primeiro commit. Cancele a manutenção quando quiser e leve o código — sem fricção de exportação.',
  },
  {
    question: 'Quem garante que uma mudança não quebra o site?',
    answer: 'Todo commit passa por um agente revisor antes de ir pra produção — quem escreve não é quem aprova.',
  },
  {
    question: 'Meu site vai aparecer no Google?',
    answer: 'Sites saem SSR/SSG com HTML real, sitemap e schema.org desde o primeiro deploy — sem depender de serviço externo de pré-renderização.',
  },
  {
    question: 'Por que não uso um app builder de IA sozinho?',
    answer: 'Builders de prompt levam até uns 70% do caminho; o resto (SEO técnico, segurança, manutenção) vira trabalho seu. Aqui a entrega é 100% produção.',
  },
  {
    question: 'Quanto custa?',
    answer: 'Preço fechado por escopo (landing, institucional ou site + blog), definido depois do brief — sem créditos, sem surpresa na fatura.',
  },
]
