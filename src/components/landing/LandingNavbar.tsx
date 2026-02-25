'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Menu, X, BookOpen } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { navLinks } from '@/data/navigation'
import { cn } from '@/lib/utils'

export function LandingNavbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-icon.svg" alt="" width={28} height={28} aria-hidden="true" />
          <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm transition-colors flex items-center gap-1 animated-underline',
                isActive(link.href)
                  ? 'text-white font-medium'
                  : 'text-foreground-secondary hover:text-white'
              )}
            >
              {link.label === 'Blog' && <BookOpen className="w-3.5 h-3.5" />}
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + Mobile trigger */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block text-sm text-foreground-secondary hover:text-white transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="hidden sm:flex button-luxury px-5 py-2 text-sm items-center gap-1.5"
          >
            Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden p-2 text-foreground-secondary hover:text-white transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background border-border p-6">
              <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <Image src="/logo-icon.svg" alt="" width={24} height={24} aria-hidden="true" />
                  <span className="font-bold text-white">Sofia AI</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-foreground-secondary hover:text-white"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-sm transition-colors',
                      isActive(link.href)
                        ? 'bg-primary/10 text-white font-medium'
                        : 'text-foreground-secondary hover:text-white hover:bg-white/5'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm text-center text-foreground-secondary hover:text-white border border-border rounded-lg transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="button-luxury px-4 py-2.5 text-sm text-center flex items-center justify-center gap-1.5"
                >
                  Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
