'use client'

import { Bell, LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InstallPWA } from '@/components/sofia/InstallPWA'

interface NavbarProps {
  user: {
    username?: string
    email?: string
  } | null
  onLogout: () => void
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U'

  return (
    <nav className="navbar-glass sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <h1 className="logo-sofia text-2xl font-bold">SOFIA</h1>
      </div>

      <div className="flex items-center gap-4">
        <InstallPWA />
        <button
          className="hover-scale relative rounded-full p-2 text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="hover-scale flex items-center gap-3 rounded-full focus:outline-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {userInitial}
            </div>
            <span className="hidden text-sm font-medium text-foreground md:block">
              {user?.username || 'Usuário'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card w-56 border-border">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.username || 'Usuário'}</p>
                <p className="text-xs text-foreground-secondary">{user?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer text-foreground hover:bg-background-secondary">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive hover:bg-background-secondary"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
