import Link from 'next/link'
import Image from 'next/image'
import { footerColumns, footerBottomLinks, footerLangLinks } from '@/data/navigation'

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image src="/logo-icon.svg" alt="Sofia AI" width={28} height={28} />
              <span className="font-bold text-white">Sofia AI</span>
            </div>
            <p className="text-foreground-tertiary text-sm max-w-xs">
              Plataforma de orquestração de agentes IA com Knowledge Base, IDE multi-modelo e canais integrados.
            </p>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-medium text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-foreground-tertiary hover:text-white text-sm transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-foreground-tertiary text-sm">
            &copy; 2026 ROI Labs. Sofia AI — Plataforma de Orquestração de Agentes IA.
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {footerBottomLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground-tertiary hover:text-white text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <span className="text-white/20 text-sm hidden md:inline">|</span>
            {footerLangLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white/40 hover:text-white text-sm transition-colors first:text-white/60"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
