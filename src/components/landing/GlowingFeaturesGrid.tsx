"use client";

import { cn } from "@/lib/utils";
import { GitBranch, Database, BrainCircuit, MessageSquare, BarChart3 } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const FEATURES = [
  {
    area: "md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]",
    icon: <GitBranch className="h-4 w-4" />,
    title: "Orquestração Multi-Agente",
    description:
      "Monte pipelines visuais onde cada agente tem um papel — Pesquisador, Analista, Revisor. Estratégias sequencial, paralela e consenso.",
  },
  {
    area: "md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]",
    icon: <Database className="h-4 w-4" />,
    title: "Knowledge Base com RAG",
    description:
      "Vetorize PDFs, DOCX e CSV. Busca semântica pgvector com score de similaridade. Agentes com contexto real do seu negócio.",
  },
  {
    area: "md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]",
    icon: <BrainCircuit className="h-4 w-4" />,
    title: "IDE Multi-Modelo",
    description:
      "Teste e compare Groq, OpenAI, Anthropic e 50+ modelos lado a lado. Streaming em tempo real com métricas de custo e tokens por execução.",
  },
  {
    area: "md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]",
    icon: <MessageSquare className="h-4 w-4" />,
    title: "Inbox Unificado",
    description:
      "WhatsApp, chat web e múltiplos canais em uma tela. Agentes IA respondem com escalada inteligente para humanos.",
  },
  {
    area: "md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]",
    icon: <BarChart3 className="h-4 w-4" />,
    title: "Analytics & Replay",
    description:
      "Custo por execução, tokens, taxa de sucesso e tempo médio. Histórico completo com replay de cada orquestração.",
  },
];

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function GridItem({ area, icon, title, description }: GridItemProps) {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-white/5 bg-gray-900/60 p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(0,0,0,0.5)] md:p-6 backdrop-blur-sm">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-white/10 bg-white/5 p-2 text-white/60">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-white">
                {title}
              </h3>
              <p className="font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-white/50">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function GlowingFeaturesGrid() {
  return (
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
      {FEATURES.map((f) => (
        <GridItem key={f.title} area={f.area} icon={f.icon} title={f.title} description={f.description} />
      ))}
    </ul>
  );
}
